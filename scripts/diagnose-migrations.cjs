// Read-only migration diagnostics. Run from the repository root on the affected server.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const postgres = require('postgres');

function logError(label, error) {
  const seen = new Set();
  let cause = error;
  for (let depth = 0; cause && depth < 5 && !seen.has(cause); depth++) {
    seen.add(cause);
    // Avoid detail/query/parameters: PostgreSQL can include actual row data there.
    const message = String(cause.message ?? cause)
      .replace(/postgres(?:ql)?:\/\/\S+/gi, '[REDACTED DATABASE URL]');
    console.error(`[${label}]`, JSON.stringify({
      depth, name: cause.name, code: cause.code, message,
      severity: cause.severity, schema: cause.schema_name,
      table: cause.table_name, column: cause.column_name,
      constraint: cause.constraint_name, routine: cause.routine,
    }, null, 2));
    cause = cause.cause;
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  // This connection does not force read-only mode, but it only runs SELECTs. It
  // lets us distinguish a server/role default from the guarded session below.
  const defaultsSql = postgres(process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    connection: {
      application_name: 'migration-defaults-diagnostics',
      statement_timeout: 8000,
      lock_timeout: 3000,
    },
  });
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
    connection: {
      application_name: 'read-only-migration-diagnostics',
      default_transaction_read_only: 'on',
      statement_timeout: 8000,
      lock_timeout: 3000,
    },
    onnotice: (notice) => console.log('[notice]', notice.code, notice.message),
  });

  async function inspect(label, query) {
    console.log(`\n[${label}] starting`);
    try {
      const rows = await sql.unsafe(query);
      console.log(JSON.stringify(rows, null, 2));
      return rows;
    } catch (error) {
      // Do not print connection URLs, query text, parameters, or row contents from errors.
      logError(label, error);
      process.exitCode = 1;
      return [];
    }
  }

  try {
    console.log('\n[database write routing defaults] starting');
    try {
      const rows = await defaultsSql`select
        current_setting('default_transaction_read_only') as default_transaction_read_only,
        current_setting('transaction_read_only') as transaction_read_only,
        pg_is_in_recovery() as server_is_in_recovery,
        current_user as current_user`;
      console.log(JSON.stringify(rows, null, 2));
    } catch (error) {
      logError('database write routing defaults', error);
      process.exitCode = 1;
    }
    await inspect('connection', `select current_setting('transaction_read_only') as read_only,
      current_setting('statement_timeout') as statement_timeout, current_schema() as current_schema,
      current_setting('server_version') as server_version, current_user as current_user`);
    const history = await inspect('migration history', `select id, hash, created_at
      from drizzle.__drizzle_migrations order by created_at desc limit 20`);
    const folder = path.resolve(__dirname, '../drizzle');
    const journal = JSON.parse(fs.readFileSync(path.join(folder, 'meta/_journal.json'), 'utf8'));
    const latest = history.reduce((value, row) => Math.max(value, Number(row.created_at)), 0);
    console.log('\n[first pending migration by timestamp]', latest
      ? journal.entries.find((entry) => entry.when > latest)?.tag ?? 'none'
      : 'unknown: no readable applied history; inspect migration history output');
    console.log('\n[local migration files compared with database history]');
    console.log(JSON.stringify(journal.entries.map((entry) => {
      const filename = path.join(folder, `${entry.tag}.sql`);
      const exists = fs.existsSync(filename);
      const hash = exists ? crypto.createHash('sha256').update(fs.readFileSync(filename, 'utf8')).digest('hex') : null;
      return {
        tag: entry.tag,
        timestamp: entry.when,
        fileExists: exists,
        newerThanLatestApplied: latest ? entry.when > latest : null,
        matchesRecentHistoryHash: history.some((row) => row.hash === hash),
      };
    }), null, 2));
    await inspect('site setting enum values', `select e.enumsortorder, e.enumlabel
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      join pg_enum e on e.enumtypid = t.oid
      where n.nspname = 'public' and t.typname = 'site_setting_type'
      order by e.enumsortorder`);
    await inspect('site setting constraints', `select conname, pg_get_constraintdef(oid) as definition
      from pg_constraint where conrelid = to_regclass('public.site_settings')
      order by conname`);
    await inspect('site setting ownership and permissions', `select
      pg_get_userbyid(c.relowner) as table_owner,
      pg_has_role(current_user, c.relowner, 'MEMBER') as member_of_table_owner_role,
      pg_get_userbyid(t.typowner) as enum_owner,
      pg_has_role(current_user, t.typowner, 'MEMBER') as member_of_enum_owner_role
      from pg_class c
      join pg_type t on t.typname = 'site_setting_type'
      join pg_namespace n on n.oid = t.typnamespace and n.nspname = 'public'
      where c.oid = to_regclass('public.site_settings')`);
    await inspect('destination columns', `select table_schema, column_name, data_type, is_nullable, column_default
      from information_schema.columns where table_name = 'destinations' order by table_schema, ordinal_position`);
    await inspect('destination has existing rows', `select exists(select 1 from public.destinations limit 1) as has_rows`);
    await inspect('destination country counts and 0014 violations', `select country, count(*)::integer as row_count,
      (country not in ('LA', 'CB', 'VN')) as violates_0014
      from public.destinations
      group by country
      order by country`);
    await inspect('destination constraints', `select conname, pg_get_constraintdef(oid) as definition
      from pg_constraint where conrelid = to_regclass('public.destinations')`);
    await inspect('destination table permissions', `select
      pg_has_role(current_user, relowner, 'MEMBER') as member_of_owner_role
      from pg_class where oid = to_regclass('public.destinations')`);
    await inspect('tour plan constraints', `select conname, convalidated,
      pg_get_constraintdef(oid) as definition
      from pg_constraint where conrelid = to_regclass('public.tour_plans')
      order by conname`);
    await inspect('tour plan ownership', `select pg_get_userbyid(relowner) as table_owner,
      pg_has_role(current_user, relowner, 'MEMBER') as member_of_owner_role
      from pg_class where oid = to_regclass('public.tour_plans')`);
    const planCounts = await inspect('0021 English itinerary constraint violations', `select
      count(*) as total_plans,
      count(*) filter (where (jsonb_typeof(name) = 'object'
        and jsonb_typeof(name->'en') = 'string'
        and length(btrim(name->>'en')) > 0) is not true) as invalid_english_names,
      count(*) filter (where (jsonb_typeof(description) = 'object'
        and jsonb_typeof(description->'en') = 'string'
        and length(btrim(description->>'en')) > 0) is not true) as invalid_english_descriptions
      from public.tour_plans`);
    if (planCounts.some((row) => Number(row.invalid_english_names) > 0
      || Number(row.invalid_english_descriptions) > 0)) {
      console.warn('[0021 preflight] Existing itinerary data violates the proposed English constraints.');
      console.warn('If 0021 is pending, its ADD CONSTRAINT statements will fail with SQLSTATE 23514 unless data is converted first.');
      console.warn('This identifies a blocker, not necessarily the first error from the previous migration run.');
    }
    await inspect('active sessions and blocking (no query text)', `select pid, application_name, state,
      wait_event_type, wait_event, pg_blocking_pids(pid) as blocking_pids,
      now() - xact_start as transaction_age, now() - query_start as query_age
      from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid()
      and (state is distinct from 'idle' or cardinality(pg_blocking_pids(pid)) > 0)
      order by query_start limit 30`);
    console.log('\n[done] No schema or data changes were made. Session visibility depends on database permissions.');
  } finally {
    await defaultsSql.end({ timeout: 2 });
    await sql.end({ timeout: 2 });
  }
}

main().catch((error) => {
  logError('diagnostic failed', error);
  process.exitCode = 1;
});
