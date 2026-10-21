// Shared import/rollback engine. Loading this module never connects to a DB.
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { normalizeGeometry } = require('./fetch-geoboundaries-adm1.cjs');

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const CODE = /^(LA|CB)-[A-Z0-9-]{1,17}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function ensure(condition, message) { if (!condition) throw new Error(message); }
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function string(value, label, max, nullable = false) {
  if (nullable && value === null) return value;
  ensure(typeof value === 'string' && value.trim().length > 0 && !value.includes('\0') && [...value].length <= max,
    `${label} must be a nonempty string of at most ${max} characters${nullable ? ' or null' : ''}.`);
  return value;
}

function validatePreview(data) {
  ensure(data?.schemaVersion === 1, 'Unsupported preview schemaVersion.');
  const source = data.source;
  ensure(source?.provider === 'geoBoundaries' && source.product === 'gbOpen' && source.administrativeLevel === 'ADM1', 'Expected geoBoundaries gbOpen ADM1 preview.');
  const country = source.databaseCountryCode;
  ensure((country === 'LA' && source.sourceCountryCode === 'LAO') || (country === 'CB' && source.sourceCountryCode === 'KHM'), 'Unsupported or inconsistent country mapping.');
  ensure(Array.isArray(data.provinces) && data.provinces.length > 0 && data.provinces.length <= 1000, 'Expected 1..1000 provinces.');
  ensure(Array.isArray(data.gisProvinces) && data.gisProvinces.length === data.provinces.length, 'Expected one GIS row per province.');
  const codes = new Set();
  const provinces = data.provinces.map((p) => {
    ensure(p && CODE.test(p.code) && p.code.startsWith(`${country}-`) && p.countryCode === country, 'Invalid country-prefixed province code.');
    ensure(!codes.has(p.code), `Duplicate province code: ${p.code}`);
    codes.add(p.code);
    ensure(p.administrativeUnitId === null, 'Only null administrativeUnitId is supported; do not reuse Vietnam unit IDs.');
    return {
      code: p.code,
      name: string(p.name, 'name', 255),
      name_en: string(p.nameEn, 'nameEn', 255, true),
      full_name: string(p.fullName, 'fullName', 255),
      full_name_en: string(p.fullNameEn, 'fullNameEn', 255, true),
      code_name: string(p.codeName, 'codeName', 255, true),
      administrative_unit_id: null,
    };
  });
  const gisCodes = new Set();
  const gis = data.gisProvinces.map((g) => {
    ensure(g && codes.has(g.provinceCode) && !gisCodes.has(g.provinceCode), 'Missing, duplicate or foreign GIS province code.');
    gisCodes.add(g.provinceCode);
    ensure(g.geom?.crs == null, 'Geometry must not override the WGS84 CRS.');
    const geometry = normalizeGeometry(g.geom, g.provinceCode).geom;
    return {
      province_code: g.provinceCode,
      gis_server_id: string(g.gisServerId, 'gisServerId', 50, true),
      geom: geometry,
    };
  });
  // Ignore supplied bbox and area: PostGIS recomputes both from validated geometry.
  return { provinces, gis, source };
}

async function loadInputs(filenames) {
  ensure(filenames.length >= 1 && filenames.length <= 2, 'Supply one or two --file= preview paths.');
  const batch = { provinces: [], gis: [], sources: [] };
  const allCodes = new Set();
  const countries = new Set();
  for (const filename of filenames) {
    const handle = await fs.open(filename, 'r');
    let raw;
    try {
      const stat = await handle.stat();
      ensure(stat.isFile() && stat.size <= MAX_FILE_BYTES, 'Preview must be a regular file no larger than 100 MiB.');
      raw = await handle.readFile();
      ensure(raw.length <= MAX_FILE_BYTES, 'Preview exceeds 100 MiB.');
    } finally { await handle.close(); }
    const data = validatePreview(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)));
    ensure(!countries.has(data.source.databaseCountryCode), 'Supply only one preview per country.');
    countries.add(data.source.databaseCountryCode);
    for (const p of data.provinces) {
      ensure(!allCodes.has(p.code), `Duplicate code across files: ${p.code}`);
      allCodes.add(p.code);
    }
    batch.provinces.push(...data.provinces);
    batch.gis.push(...data.gis);
    batch.sources.push({ filename: path.basename(filename), previewSha256: hash(raw), source: data.source });
  }
  return batch;
}

function validateSnapshot(snapshot, expectedHash) {
  ensure(snapshot && hash(canonical(snapshot)) === expectedHash, 'Audit snapshot checksum mismatch. Stop and restore/audit history; do not force rollback.');
  ensure(Array.isArray(snapshot.provinces) && snapshot.provinces.length > 0 && snapshot.provinces.length <= 2000, 'Invalid audit province snapshot.');
  ensure(Array.isArray(snapshot.gis) && snapshot.gis.length === snapshot.provinces.length, 'Invalid audit GIS snapshot.');
  const codes = snapshot.provinces.map((p) => p.code);
  ensure(codes.every((code) => typeof code === 'string' && CODE.test(code)) && new Set(codes).size === codes.length, 'Audit contains unsafe or duplicate province codes.');
  const gisCodes = snapshot.gis.map((g) => g.province_code);
  const ids = snapshot.gis.map((g) => g.id);
  ensure(gisCodes.every((code) => codes.includes(code)) && new Set(gisCodes).size === codes.length, 'Audit GIS mapping mismatch.');
  ensure(ids.every((id) => Number.isSafeInteger(id) && id > 0) && new Set(ids).size === ids.length, 'Invalid audit GIS IDs.');
  return { codes, ids };
}

// Called only inside a single transaction. The store is injectable for offline tests.
async function importBatch(store, input, apply) {
  const codes = input.provinces.map((p) => p.code);
  const conflicts = await store.conflicts(codes);
  ensure(conflicts.length === 0, `Import is insert-only. Existing province/GIS codes: ${conflicts.map((c) => c.code).join(', ')}`);
  const prepared = [];
  for (const row of input.gis) prepared.push(await store.prepareGeometry(row));
  if (!apply) return { mode: 'dry-run', wouldInsertProvinces: codes.length, wouldInsertGis: prepared.length, codes, sources: input.sources };
  const id = crypto.randomUUID();
  for (const row of input.provinces) await store.insertProvince(row);
  const ids = [];
  for (const row of prepared) ids.push(await store.insertGis(row));
  const snapshot = await store.snapshot(codes);
  ensure(snapshot.provinces.length === codes.length && snapshot.gis.length === ids.length, 'Inserted row count mismatch.');
  const snapshotHash = hash(canonical(snapshot));
  const checked = validateSnapshot(snapshot, snapshotHash);
  ensure(checked.ids.every((value) => ids.includes(value)), 'Inserted GIS identity mismatch.');
  await store.insertBatch({ id, sources: input.sources, snapshot, snapshotHash });
  return { mode: 'applied', batchId: id, insertedProvinces: codes.length, insertedGis: ids.length };
}

async function rollbackBatch(store, id, apply) {
  ensure(UUID.test(id), 'Invalid batch UUID.');
  const batch = await store.getBatch(id);
  ensure(batch, 'Import batch not found in this database.');
  ensure(batch.format_version === 1, 'Unsupported audit format version.');
  if (batch.status === 'rolled_back') return { mode: apply ? 'applied' : 'dry-run', batchId: id, status: 'already-rolled-back', deleted: 0 };
  ensure(batch.status === 'imported', 'Unexpected import batch status.');
  const { codes, ids } = validateSnapshot(batch.snapshot, batch.snapshot_sha256);
  const actual = await store.snapshot(codes);
  ensure(canonical(actual) === canonical(batch.snapshot), 'Rollback conflict: imported rows were edited, deleted, replaced, or additional GIS rows were added. Nothing deleted.');
  await store.assertNoReferences(codes);
  if (!apply) return { mode: 'dry-run', batchId: id, wouldDeleteProvinces: codes.length, wouldDeleteGis: ids.length, codes };
  ensure(await store.deleteGis(ids) === ids.length, 'GIS delete count mismatch.');
  ensure(await store.deleteProvinces(codes) === codes.length, 'Province delete count mismatch.');
  await store.markRolledBack(id);
  return { mode: 'applied', batchId: id, status: 'rolled-back', deletedProvinces: codes.length, deletedGis: ids.length };
}

function postgresStore(sql) {
  return {
    async conflicts(codes) {
      return sql`select code from public.provinces where code in ${sql(codes)}
        union select province_code as code from public.gis_provinces where province_code in ${sql(codes)}`;
    },
    async prepareGeometry(row) {
      const [result] = await sql`with source as (
          select ST_SetSRID(ST_Multi(ST_GeomFromGeoJSON(${JSON.stringify(row.geom)})), 4326) as geom
        ) select ST_IsValid(geom) as valid, ST_IsValidReason(geom) as reason,
          ST_IsEmpty(geom) as empty, ST_NDims(geom) as dimensions,
          GeometryType(geom) as geometry_type,
          encode(ST_AsEWKB(geom, 'NDR'), 'hex') as geom_hex,
          encode(ST_AsEWKB(ST_Envelope(geom), 'NDR'), 'hex') as bbox_hex,
          (ST_Area(geom::geography) / 1000000)::numeric(12,5)::text as area_km2
        from source`;
      ensure(result.valid && !result.empty && result.dimensions === 2 && result.geometry_type === 'MULTIPOLYGON',
        `Invalid PostGIS geometry for ${row.province_code}: ${result.reason}`);
      ensure(Number(result.area_km2) > 0, `Nonpositive area for ${row.province_code}.`);
      return { province_code: row.province_code, gis_server_id: row.gis_server_id, ...result };
    },
    async insertProvince(row) { await sql`insert into public.provinces ${sql(row)}`; },
    async insertGis(row) {
      const [result] = await sql`insert into public.gis_provinces (province_code, gis_server_id, area_km2, bbox, geom)
        values (${row.province_code}, ${row.gis_server_id}, ${row.area_km2},
          ST_GeomFromEWKB(decode(${row.bbox_hex}, 'hex')), ST_GeomFromEWKB(decode(${row.geom_hex}, 'hex')))
        returning id`;
      return result.id;
    },
    async snapshot(codes) {
      // Full row JSON catches schema drift; EWKB retains exact doubles, SRID and topology.
      // xmin also detects an UPDATE restoring the old values or delete/reinsert.
      const provinces = await sql`select to_jsonb(p) || jsonb_build_object('_xmin', p.xmin::text) as row
        from public.provinces p where code in ${sql(codes)} order by code collate "C"`;
      const gis = await sql`select (to_jsonb(g) - 'geom' - 'bbox') || jsonb_build_object(
          'area_km2', g.area_km2::text, '_xmin', g.xmin::text,
          'geom_ewkb', encode(ST_AsEWKB(g.geom, 'NDR'), 'hex'),
          'bbox_ewkb', encode(ST_AsEWKB(g.bbox, 'NDR'), 'hex')) as row
        from public.gis_provinces g where province_code in ${sql(codes)} order by id`;
      return { provinces: provinces.map((r) => r.row), gis: gis.map((r) => r.row) };
    },
    async insertBatch(batch) {
      await sql`insert into public.geo_import_batches (id, format_version, status, sources, snapshot, snapshot_sha256)
        values (${batch.id}, 1, 'imported', ${sql.json(batch.sources)}, ${sql.json(batch.snapshot)}, ${batch.snapshotHash})`;
    },
    async getBatch(id) { return (await sql`select * from public.geo_import_batches where id = ${id}`)[0]; },
    async assertNoReferences(codes) {
      const [refs] = await sql`select
        exists(select 1 from public.wards where province_code in ${sql(codes)}) as wards,
        exists(select 1 from public.destination_provinces where province_code in ${sql(codes)}) as destinations`;
      ensure(!refs.wards && !refs.destinations, 'Rollback conflict: provinces are referenced by wards or destination_provinces. Remove/reassign links manually after review; no cascading deletion is permitted.');
    },
    async deleteGis(ids) { return (await sql`delete from public.gis_provinces where id in ${sql(ids)} returning id`).length; },
    async deleteProvinces(codes) { return (await sql`delete from public.provinces where code in ${sql(codes)} returning code`).length; },
    async markRolledBack(id) {
      const rows = await sql`update public.geo_import_batches set status = 'rolled_back', rolled_back_at = now()
        where id = ${id} and status = 'imported' returning id`;
      ensure(rows.length === 1, 'Audit status update failed.');
    },
  };
}

async function preflight(sql, apply) {
  await sql`set local search_path = public, pg_catalog`;
  await sql`set local statement_timeout = '60s'`;
  await sql`set local lock_timeout = '5s'`;
  await sql`set local idle_in_transaction_session_timeout = '60s'`;
  await sql`set local row_security = off`;
  const [tables] = await sql`select to_regclass('public.geo_import_batches') as history,
    to_regclass('public.provinces') as provinces, to_regclass('public.gis_provinces') as gis,
    to_regclass('public.wards') as wards, to_regclass('public.destination_provinces') as destinations`;
  ensure(Object.values(tables).every(Boolean), 'Required tables are missing. Review/apply the geo_import_batches migration and existing schema first.');
  await sql`select PostGIS_Version()`;
  if (apply) {
    // Short-lived, deliberately conservative locks: block concurrent DML and FK additions.
    // SELECTs are still allowed. Include referencing tables to close rollback races.
    await sql`lock table public.geo_import_batches, public.provinces, public.gis_provinces,
      public.wards, public.destination_provinces in share row exclusive mode`;
  }
  const triggers = await sql`select tgname from pg_trigger where not tgisinternal
    and tgenabled <> 'D' and tgrelid in ('public.provinces'::regclass,
      'public.gis_provinces'::regclass, 'public.geo_import_batches'::regclass)`;
  ensure(triggers.length === 0, 'Custom triggers on import tables require manual review before using this script.');
  const fks = await sql`select c.conname, c.confdeltype, c.convalidated,
      c.conrelid::regclass::text as child, c.confrelid::regclass::text as parent,
      cardinality(c.conkey) as columns, a.attname as child_column, b.attname as parent_column
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    join pg_attribute b on b.attrelid = c.confrelid and b.attnum = c.confkey[1]
    where c.contype = 'f' and c.confrelid in ('public.provinces'::regclass, 'public.gis_provinces'::regclass)`;
  const stripPublic = (name) => name.replace(/^public\./, '');
  for (const fk of fks) {
    ensure(stripPublic(fk.parent) === 'provinces' && ['wards', 'destination_provinces', 'gis_provinces'].includes(stripPublic(fk.child))
      && fk.columns === 1 && fk.child_column === 'province_code' && fk.parent_column === 'code'
      && ['a', 'r'].includes(fk.confdeltype) && fk.convalidated,
    `Unsupported inbound FK ${fk.conname}; refusing to risk cascade or untracked references.`);
  }
  // A future country-column migration requires adapting this tool, not silently guessing.
  const columns = await sql`select attname from pg_attribute where attrelid = 'public.provinces'::regclass
    and attnum > 0 and not attisdropped order by attname`;
  ensure(canonical(columns.map((c) => c.attname)) === canonical([
    'administrative_unit_id', 'code', 'code_name', 'full_name', 'full_name_en', 'name', 'name_en',
  ]), 'Province columns differ from the reviewed schema. Update the importer before proceeding.');
}

async function executeOperation(client, options, input) {
  return client.begin(options.apply ? 'read write' : 'isolation level repeatable read read only', async (sql) => {
    if (options.confirmDatabase) {
      const [target] = await sql`select current_database() as name`;
      ensure(target.name === options.confirmDatabase, 'Connected server database differs from the confirmed database.');
    }
    await preflight(sql, options.apply);
    const store = postgresStore(sql);
    return options.operation === 'import'
      ? importBatch(store, input, options.apply)
      : rollbackBatch(store, options.batchId, options.apply);
  });
}

function parseCli(operation, argv) {
  const options = { operation, apply: false, files: [], envFile: '.env' };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--apply') options.apply = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--file=') && operation === 'import') options.files.push(arg.slice(7));
    else if (arg.startsWith('--batch=') && operation === 'rollback') options.batchId = arg.slice(8);
    else if (arg.startsWith('--confirm-database=')) options.confirmDatabase = arg.slice(19);
    else if (arg.startsWith('--env-file=')) options.envFile = arg.slice(11);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.help) return options;
  ensure(!(options.apply && options.dryRun), 'Do not combine --apply and --dry-run.');
  ensure(options.envFile.trim(), '--env-file must not be empty.');
  if (operation === 'import') ensure(options.files.length >= 1 && options.files.length <= 2 && options.files.every((s) => s.trim()), 'Use one or two --file= paths.');
  else ensure(UUID.test(options.batchId ?? ''), 'Use --batch=UUID from the successful import output or history table.');
  ensure(!options.apply || Boolean(options.confirmDatabase), '--apply requires --confirm-database=exact_database_name.');
  return options;
}

async function cli(operation) {
  const options = parseCli(operation, process.argv.slice(2));
  if (options.help) {
    console.log(`Usage: npm run geo:${operation}:adm1 -- ${operation === 'import' ? '--file=PATH [--file=PATH]' : '--batch=UUID'} [--dry-run | --apply --confirm-database=NAME] [--env-file=PATH]
Default: read-only dry-run. No migration is executed. Apply is insert-only / conflict-checked rollback.
Requires existing public tables, the geo_import_batches migration, and PostGIS.
Environment variables override the selected dotenv file. No database URL is printed.`);
    return;
  }
  const input = operation === 'import' ? await loadInputs(options.files) : null;
  require('dotenv').config({ path: path.resolve(options.envFile), quiet: true });
  const url = process.env.DATABASE_URL;
  ensure(url, 'DATABASE_URL is required.');
  const parsed = new URL(url);
  ensure(['postgres:', 'postgresql:'].includes(parsed.protocol), 'DATABASE_URL must be a PostgreSQL URL.');
  const database = decodeURIComponent(parsed.pathname.slice(1));
  ensure(database && (!options.apply || options.confirmDatabase === database), 'Database confirmation does not match DATABASE_URL.');
  console.log(JSON.stringify({ operation, mode: options.apply ? 'APPLY' : 'DRY-RUN', host: parsed.hostname, port: parsed.port || '5432', database }));
  if (operation === 'import') console.warn('Review source years/license first. Keeping the current schema/UI does NOT enable country filtering; imported rows can appear in the existing unfiltered Vietnam province search. Prefer a test DB.');
  const client = require('postgres')(url, {
    max: 1, prepare: false, connect_timeout: 10,
    connection: { application_name: `geo-adm1-${operation}`, default_transaction_read_only: options.apply ? 'off' : 'on' },
    onnotice: () => {},
  });
  try {
    const result = await executeOperation(client, options, input);
    // Print only after the transaction has committed successfully.
    console.log(JSON.stringify(result, null, 2));
  } finally { await client.end({ timeout: 5 }); }
}

function reportError(error) {
  // Never print SQL/detail/parameters: they can contain source rows or credentials.
  const message = String(error?.message ?? error).replace(/postgres(?:ql)?:\/\/\S+/gi, '[REDACTED DATABASE URL]');
  console.error(`[geo-adm1] ${message}`);
  if (error?.code) console.error(`Database/error code: ${error.code}`);
  process.exitCode = 1;
}

module.exports = { cli, reportError, parseCli, validatePreview, loadInputs, canonical, hash, validateSnapshot,
  importBatch, rollbackBatch, executeOperation, postgresStore };
