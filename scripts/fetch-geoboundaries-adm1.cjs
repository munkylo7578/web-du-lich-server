// Download and normalize geoBoundaries gbOpen ADM1 data for review.
// This script never reads DATABASE_URL and never connects to a database.
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const SCRIPT_VERSION = 1;
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_METADATA_BYTES = 5 * 1024 * 1024;
const MAX_GEOJSON_BYTES = 100 * 1024 * 1024;

const COUNTRY_CONFIG = {
  LAO: { databaseCountryCode: 'LA', label: 'Laos' },
  KHM: { databaseCountryCode: 'CB', label: 'Cambodia' },
};

function parseArguments(argv) {
  const options = {
    countries: Object.keys(COUNTRY_CONFIG),
    outputRoot: path.resolve(process.cwd(), 'data/geoboundaries-adm1'),
  };

  for (const argument of argv) {
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    if (argument.startsWith('--output=')) {
      const output = argument.slice('--output='.length).trim();
      if (!output) throw new Error('--output must not be empty.');
      options.outputRoot = path.resolve(process.cwd(), output);
      continue;
    }
    if (argument.startsWith('--countries=')) {
      const countries = argument
        .slice('--countries='.length)
        .split(',')
        .map((country) => country.trim().toUpperCase())
        .filter(Boolean);
      if (!countries.length) throw new Error('--countries must contain LAO, KHM, or both.');
      const unsupported = countries.filter((country) => !Object.hasOwn(COUNTRY_CONFIG, country));
      if (unsupported.length) {
        throw new Error(`Unsupported countries: ${unsupported.join(', ')}. Use LAO and/or KHM.`);
      }
      options.countries = [...new Set(countries)];
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/fetch-geoboundaries-adm1.cjs [options]

Options:
  --countries=LAO,KHM   Countries to download (default: both)
  --output=PATH         Output root (default: data/geoboundaries-adm1)
  --help, -h            Show this help

The script downloads raw metadata and GeoJSON, then writes normalized JSON and
review reports. It never connects to a database.`);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function timestampForPath(date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function assertHttpsUrl(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} is not a valid URL: ${String(value)}`);
  }
  if (url.protocol !== 'https:') throw new Error(`${label} must use HTTPS: ${url.href}`);
  if (url.username || url.password) throw new Error(`${label} must not contain credentials.`);
  return url;
}

async function fetchBuffer(url, { label, maxBytes }) {
  const safeUrl = assertHttpsUrl(url, label);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(safeUrl, {
      headers: {
        Accept: 'application/json, application/geo+json;q=0.9, */*;q=0.1',
        'User-Agent': 'web-du-lich-geo-data-review/1.0',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${label} request failed with HTTP ${response.status} ${response.statusText}.`);
    }
    assertHttpsUrl(response.url, `${label} final URL`);
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    // GitHub serves the actual GeoJSON downloads as application/octet-stream.
    if (!['application/json', 'application/geo+json', 'application/octet-stream', 'text/plain'].includes(contentType)
      && !contentType.endsWith('+json')) {
      throw new Error(`${label} has an unsupported Content-Type: ${contentType || '(missing)'}.`);
    }

    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new Error(`${label} is too large (${declaredLength} bytes; limit ${maxBytes}).`);
    }

    if (!response.body) throw new Error(`${label} has no response body.`);
    const chunks = [];
    let receivedBytes = 0;
    for await (const chunk of response.body) {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        controller.abort();
        throw new Error(`${label} is too large (limit ${maxBytes} bytes).`);
      }
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks, receivedBytes);

    return {
      buffer,
      contentType: response.headers.get('content-type'),
      finalUrl: response.url,
      sha256: sha256(buffer),
      sizeBytes: buffer.length,
    };
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error(`${label} request timed out after ${REQUEST_TIMEOUT_MS} ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJson(buffer, label) {
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
  } catch (error) {
    throw new Error(`${label} is not valid UTF-8 JSON: ${error.message}`);
  }
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value;
}

function metadataDownloadUrl(metadata) {
  const candidates = [
    metadata.gjDownloadURL,
    metadata.geoJSONDownloadURL,
  ];
  const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
  if (!value) {
    throw new Error('Metadata does not contain gjDownloadURL (or another recognized GeoJSON URL).');
  }
  return assertHttpsUrl(value, 'GeoJSON download URL').href;
}

function firstString(object, keys) {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === 'string' && value.trim() && value.trim() !== '-99') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255);
}

function sourceFeatureIdentity(properties, featureIndex) {
  return (
    firstString(properties, [
      'shapeID',
      'shapeISO',
      'GID_1',
      'ADM1_PCODE',
      'pcode',
      'id',
    ]) ?? `feature-${featureIndex + 1}`
  );
}

function featureName(properties, featureIndex) {
  const name = firstString(properties, [
    'shapeName',
    'name',
    'NAME_1',
    'ADM1_EN',
    'ADM1_NAME',
    'Name',
    'NAME',
  ]);
  if (!name) throw new Error(`Feature ${featureIndex + 1} does not contain a recognized province name.`);
  if ([...name].length > 255) throw new Error(`Feature ${featureIndex + 1} name exceeds the database limit of 255 characters.`);
  return name;
}

function proposedProvinceCode(databaseCountryCode, properties, name, sourceIdentity) {
  const sourceCode = firstString(properties, ['shapeISO', 'ADM1_PCODE', 'pcode', 'GID_1']);
  if (sourceCode) {
    let localPart = sourceCode.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const prefix = databaseCountryCode === 'LA' ? /^(?:LAO|LA)-/ : /^(?:KHM|KH|CB)-/;
    localPart = localPart.replace(prefix, '');
    const proposed = `${databaseCountryCode}-${localPart}`;
    if (localPart && proposed.length <= 20) return proposed;
  }

  const digest = sha256(Buffer.from(`${sourceIdentity}\0${name}`, 'utf8')).slice(0, 12).toUpperCase();
  return `${databaseCountryCode}-${digest}`;
}

function visitPositions(coordinates, visitor, label) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    throw new Error(`${label} contains an empty coordinate array.`);
  }
  if (typeof coordinates[0] === 'number') {
    if (coordinates.length < 2) throw new Error(`${label} contains a position with fewer than two numbers.`);
    const longitude = coordinates[0];
    const latitude = coordinates[1];
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      throw new Error(`${label} contains a non-finite coordinate.`);
    }
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      throw new Error(`${label} has coordinates outside EPSG:4326 bounds: ${longitude}, ${latitude}.`);
    }
    visitor(longitude, latitude);
    return;
  }
  for (const child of coordinates) visitPositions(child, visitor, label);
}

function normalizeGeometry(geometry, label) {
  assertPlainObject(geometry, `${label} geometry`);
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
    throw new Error(`${label} geometry must be Polygon or MultiPolygon, received ${String(geometry.type)}.`);
  }
  const multiPolygonCoordinates =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  if (!Array.isArray(multiPolygonCoordinates) || !multiPolygonCoordinates.length) {
    throw new Error(`${label} must contain at least one polygon.`);
  }
  for (const polygon of multiPolygonCoordinates) {
    if (!Array.isArray(polygon) || !polygon.length) throw new Error(`${label} polygon has no rings.`);
    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) throw new Error(`${label} ring requires at least four positions.`);
      for (const position of ring) {
        // The current PostGIS columns are 2D. Do not silently discard altitude.
        if (!Array.isArray(position) || position.length !== 2 || !position.every(Number.isFinite)) {
          throw new Error(`${label} requires finite 2D positions.`);
        }
      }
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) throw new Error(`${label} ring is not closed.`);
      if (new Set(ring.map((position) => position.join(','))).size < 3) {
        throw new Error(`${label} ring requires at least three distinct positions.`);
      }
    }
  }

  let vertexCount = 0;
  const bounds = {
    minLongitude: Infinity,
    minLatitude: Infinity,
    maxLongitude: -Infinity,
    maxLatitude: -Infinity,
  };
  visitPositions(
    geometry.coordinates,
    (longitude, latitude) => {
      vertexCount += 1;
      bounds.minLongitude = Math.min(bounds.minLongitude, longitude);
      bounds.minLatitude = Math.min(bounds.minLatitude, latitude);
      bounds.maxLongitude = Math.max(bounds.maxLongitude, longitude);
      bounds.maxLatitude = Math.max(bounds.maxLatitude, latitude);
    },
    label,
  );

  if (bounds.minLongitude === bounds.maxLongitude || bounds.minLatitude === bounds.maxLatitude) {
    throw new Error(`${label} has a degenerate bounding box.`);
  }
  const bboxCoordinates = [[
    [bounds.minLongitude, bounds.minLatitude],
    [bounds.maxLongitude, bounds.minLatitude],
    [bounds.maxLongitude, bounds.maxLatitude],
    [bounds.minLongitude, bounds.maxLatitude],
    [bounds.minLongitude, bounds.minLatitude],
  ]];

  return {
    sourceGeometryType: geometry.type,
    vertexCount,
    geom: { type: 'MultiPolygon', coordinates: multiPolygonCoordinates },
    bbox: { type: 'Polygon', coordinates: bboxCoordinates },
  };
}

function uniqueGisServerId(sourceIdentity, usedIds) {
  let candidate = sourceIdentity;
  if (candidate.length > 50) {
    candidate = `gb-${sha256(Buffer.from(sourceIdentity, 'utf8')).slice(0, 40)}`;
  }
  if (usedIds.has(candidate)) throw new Error(`Duplicate GIS source identity: ${sourceIdentity}`);
  usedIds.add(candidate);
  return candidate;
}

function normalizeFeatureCollection(geoJson, sourceIso, countryConfig) {
  assertPlainObject(geoJson, `${sourceIso} GeoJSON`);
  if (geoJson.type !== 'FeatureCollection' || !Array.isArray(geoJson.features)) {
    throw new Error(`${sourceIso} GeoJSON must be a FeatureCollection with a features array.`);
  }
  if (!geoJson.features.length) throw new Error(`${sourceIso} GeoJSON has no features.`);
  if (geoJson.crs != null) {
    const name = geoJson.crs?.properties?.name;
    if (geoJson.crs.type !== 'name' || ![
      'urn:ogc:def:crs:OGC:1.3:CRS84', 'urn:ogc:def:crs:OGC::CRS84',
      'urn:ogc:def:crs:EPSG::4326', 'EPSG:4326',
    ].includes(name)) {
      throw new Error(`${sourceIso} declares an unsupported CRS; reprojection is required.`);
    }
  }

  const usedProvinceCodes = new Set();
  const usedGisServerIds = new Set();
  const propertyKeys = new Set();
  const geometryTypeCounts = {};
  let totalVertices = 0;

  const provinces = [];
  const gisProvinces = [];
  const mappings = [];

  for (const [featureIndex, featureValue] of geoJson.features.entries()) {
    const feature = assertPlainObject(featureValue, `${sourceIso} feature ${featureIndex + 1}`);
    if (feature.type !== 'Feature') throw new Error(`${sourceIso} feature ${featureIndex + 1} is not a Feature.`);
    const properties = assertPlainObject(feature.properties, `${sourceIso} feature ${featureIndex + 1} properties`);
    if (properties.shapeGroup != null && properties.shapeGroup !== sourceIso) {
      throw new Error(`${sourceIso} feature ${featureIndex + 1} belongs to another country.`);
    }
    if (properties.shapeType != null && properties.shapeType !== 'ADM1') {
      throw new Error(`${sourceIso} feature ${featureIndex + 1} is not ADM1.`);
    }
    for (const key of Object.keys(properties)) propertyKeys.add(key);

    const name = featureName(properties, featureIndex);
    const sourceIdentity = sourceFeatureIdentity(properties, featureIndex);
    let provinceCode = proposedProvinceCode(
      countryConfig.databaseCountryCode,
      properties,
      name,
      sourceIdentity,
    );
    if (usedProvinceCodes.has(provinceCode)) {
      provinceCode = `${countryConfig.databaseCountryCode}-${sha256(
        Buffer.from(`${sourceIdentity}\0${name}`, 'utf8'),
      ).slice(0, 12).toUpperCase()}`;
    }
    if (usedProvinceCodes.has(provinceCode)) throw new Error(`Duplicate proposed province code: ${provinceCode}`);
    usedProvinceCodes.add(provinceCode);

    const normalizedGeometry = normalizeGeometry(feature.geometry, `${sourceIso} feature ${featureIndex + 1}`);
    geometryTypeCounts[normalizedGeometry.sourceGeometryType] =
      (geometryTypeCounts[normalizedGeometry.sourceGeometryType] ?? 0) + 1;
    totalVertices += normalizedGeometry.vertexCount;

    const gisServerId = uniqueGisServerId(sourceIdentity, usedGisServerIds);
    const sourceCode = firstString(properties, ['shapeISO', 'ADM1_PCODE', 'pcode', 'GID_1']);
    const codeName = slugify(name) || provinceCode.toLowerCase();

    provinces.push({
      code: provinceCode,
      countryCode: countryConfig.databaseCountryCode,
      name,
      nameEn: null,
      fullName: name,
      fullNameEn: null,
      codeName,
      administrativeUnitId: null,
    });
    gisProvinces.push({
      provinceCode,
      gisServerId,
      areaKm2: null,
      bbox: normalizedGeometry.bbox,
      geom: normalizedGeometry.geom,
    });
    mappings.push({
      provinceCode,
      sourceFeatureId: sourceIdentity,
      sourceCode,
      sourceName: name,
      sourceGeometryType: normalizedGeometry.sourceGeometryType,
      vertexCount: normalizedGeometry.vertexCount,
    });
  }

  provinces.sort((left, right) => left.code.localeCompare(right.code, 'en'));
  gisProvinces.sort((left, right) => left.provinceCode.localeCompare(right.provinceCode, 'en'));
  mappings.sort((left, right) => left.provinceCode.localeCompare(right.provinceCode, 'en'));

  return {
    provinces,
    gisProvinces,
    mappings,
    inspection: {
      featureCount: geoJson.features.length,
      geometryTypeCounts,
      totalVertices,
      propertyKeys: [...propertyKeys].sort(),
    },
  };
}

async function writeJson(filename, value) {
  await fs.writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function safeMetadataSummary(metadata) {
  const keys = [
    'boundaryID',
    'boundaryName',
    'boundaryISO',
    'boundaryYearRepresented',
    'boundaryType',
    'boundaryCanonical',
    'boundarySource',
    'boundaryLicense',
    'licenseDetail',
    'licenseSource',
    'sourceDataUpdateDate',
    'buildDate',
  ];
  return Object.fromEntries(keys.filter((key) => metadata[key] !== undefined).map((key) => [key, metadata[key]]));
}

async function processCountry({ sourceIso, countryConfig, runDirectory, generatedAt }) {
  const metadataUrl = `https://www.geoboundaries.org/api/current/gbOpen/${sourceIso}/ADM1/`;
  console.log(`[${sourceIso}] Fetching metadata: ${metadataUrl}`);
  const metadataResponse = await fetchBuffer(metadataUrl, {
    label: `${sourceIso} metadata`,
    maxBytes: MAX_METADATA_BYTES,
  });
  const metadata = assertPlainObject(parseJson(metadataResponse.buffer, `${sourceIso} metadata`), `${sourceIso} metadata`);
  if (metadata.boundaryISO !== sourceIso || metadata.boundaryType !== 'ADM1') {
    throw new Error(`${sourceIso} metadata country or administrative level does not match the request.`);
  }
  const rawDirectory = path.join(runDirectory, 'raw', sourceIso);
  const normalizedDirectory = path.join(runDirectory, 'normalized');
  await fs.mkdir(rawDirectory, { recursive: true });
  await fs.mkdir(normalizedDirectory, { recursive: true });
  await fs.writeFile(path.join(rawDirectory, 'metadata.json'), metadataResponse.buffer);
  const downloadUrl = metadataDownloadUrl(metadata);

  console.log(`[${sourceIso}] Fetching GeoJSON: ${downloadUrl}`);
  const geoJsonResponse = await fetchBuffer(downloadUrl, {
    label: `${sourceIso} GeoJSON`,
    maxBytes: MAX_GEOJSON_BYTES,
  });
  await fs.writeFile(path.join(rawDirectory, 'adm1.geojson'), geoJsonResponse.buffer);
  const geoJson = parseJson(geoJsonResponse.buffer, `${sourceIso} GeoJSON`);
  const normalized = normalizeFeatureCollection(geoJson, sourceIso, countryConfig);

  const preview = {
    schemaVersion: SCRIPT_VERSION,
    generatedAt,
    purpose: 'Review-only normalized data. Not imported into the database.',
    source: {
      provider: 'geoBoundaries',
      product: 'gbOpen',
      administrativeLevel: 'ADM1',
      sourceCountryCode: sourceIso,
      databaseCountryCode: countryConfig.databaseCountryCode,
      metadataUrl,
      geoJsonUrl: geoJsonResponse.finalUrl,
      metadata: safeMetadataSummary(metadata),
      files: {
        metadata: {
          contentType: metadataResponse.contentType,
          sizeBytes: metadataResponse.sizeBytes,
          sha256: metadataResponse.sha256,
        },
        geoJson: {
          contentType: geoJsonResponse.contentType,
          sizeBytes: geoJsonResponse.sizeBytes,
          sha256: geoJsonResponse.sha256,
        },
      },
    },
    notes: [
      'countryCode is preview metadata, not a current provinces column. The insert-only importer omits it and retains country in batch history.',
      'nameEn/fullNameEn remain null because the source field language has not been independently verified.',
      'areaKm2 remains null; calculate it with PostGIS geography or an appropriate projected CRS during import.',
      'Polygon geometries are wrapped as MultiPolygon; coordinates are otherwise preserved.',
      'Proposed province codes must be reviewed before they become persistent identifiers.',
      'Hashes are repeatable for identical source IDs and names, not guaranteed stable between source releases.',
      'Coordinates are not reprojected. Only 2D WGS84 longitude/latitude input is accepted.',
      'Structural checks do not prove topology validity, current boundaries, or legal suitability.',
    ],
    inspection: normalized.inspection,
    mappings: normalized.mappings,
    provinces: normalized.provinces,
    gisProvinces: normalized.gisProvinces,
  };

  const normalizedFilename = path.join(normalizedDirectory, `${sourceIso}-ADM1.preview.json`);
  await writeJson(normalizedFilename, preview);
  console.log(
    `[${sourceIso}] Normalized ${normalized.inspection.featureCount} features ` +
      `(${normalized.inspection.totalVertices} vertices).`,
  );

  return {
    sourceCountryCode: sourceIso,
    databaseCountryCode: countryConfig.databaseCountryCode,
    label: countryConfig.label,
    metadataUrl,
    geoJsonUrl: geoJsonResponse.finalUrl,
    metadata: safeMetadataSummary(metadata),
    checksums: {
      metadataSha256: metadataResponse.sha256,
      geoJsonSha256: geoJsonResponse.sha256,
    },
    sizes: {
      metadataBytes: metadataResponse.sizeBytes,
      geoJsonBytes: geoJsonResponse.sizeBytes,
    },
    inspection: normalized.inspection,
    provinces: normalized.provinces,
    output: path.relative(runDirectory, normalizedFilename).replaceAll('\\', '/'),
  };
}

function markdownReport(runId, generatedAt, countryResults) {
  const lines = [
    '# geoBoundaries ADM1 fetch report',
    '',
    `- Run: \`${runId}\``,
    `- Generated: \`${generatedAt}\``,
    '- Database access: **none**',
    '- Status: downloaded and normalized for review only',
    '',
    '| Source country | DB country | Features | Geometry types | Vertices | Raw GeoJSON bytes |',
    '|---|---:|---:|---|---:|---:|',
  ];
  for (const result of countryResults) {
    const geometryTypes = Object.entries(result.inspection.geometryTypeCounts)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');
    lines.push(
      `| ${result.sourceCountryCode} | ${result.databaseCountryCode} | ${result.inspection.featureCount} | ` +
        `${geometryTypes} | ${result.inspection.totalVertices} | ${result.sizes.geoJsonBytes} |`,
    );
  }
  const escapeCell = (value) => String(value ?? '(not supplied)').replaceAll('|', '\\|').replace(/[\r\n]/g, ' ');
  for (const result of countryResults) {
    lines.push('', `## ${result.sourceCountryCode}: source and province preview`, '');
    lines.push(`- Represented year: ${escapeCell(result.metadata.boundaryYearRepresented)}`);
    lines.push(`- Source: ${escapeCell(result.metadata.boundarySource)}`);
    lines.push(`- License: ${escapeCell(result.metadata.boundaryLicense)}`);
    lines.push('- These are source metadata claims, not independent verification of current boundaries.');
    lines.push('', '| Proposed code | Source name |', '|---|---|');
    for (const province of result.provinces) {
      lines.push(`| ${escapeCell(province.code)} | ${escapeCell(province.name)} |`);
    }
  }
  lines.push('', '## Review checklist', '');
  lines.push('- Confirm the dataset license and required attribution from raw metadata.');
  lines.push('- Confirm ADM1 feature counts against an authoritative source for the represented year.');
  lines.push('- Review every proposed province code, source name, and source feature identifier.');
  lines.push('- Open raw GeoJSON in QGIS and check invalid, missing, overlapping, or unexpected geometries.');
  lines.push('- Use only the reviewed insert-only importer with batch history; current schema/UI still do not filter provinces by country.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is unavailable. Run this script with Node.js 20 or newer.');
  }

  const now = new Date();
  const generatedAt = now.toISOString();
  const runId = `${timestampForPath(now)}-${crypto.randomBytes(3).toString('hex')}`;
  const runDirectory = path.join(options.outputRoot, runId);
  await fs.mkdir(options.outputRoot, { recursive: true });
  await fs.mkdir(runDirectory);

  console.log(`[run] Output: ${runDirectory}`);
  console.log('[run] No database connection will be opened.');

  const countryResults = [];
  for (const sourceIso of options.countries) {
    countryResults.push(
      await processCountry({
        sourceIso,
        countryConfig: COUNTRY_CONFIG[sourceIso],
        runDirectory,
        generatedAt,
      }),
    );
  }

  const report = {
    schemaVersion: SCRIPT_VERSION,
    runId,
    generatedAt,
    databaseAccess: false,
    countries: countryResults,
  };
  await writeJson(path.join(runDirectory, 'report.json'), report);
  await fs.writeFile(
    path.join(runDirectory, 'REPORT.md'),
    markdownReport(runId, generatedAt, countryResults),
    'utf8',
  );

  console.log(`[done] Review ${path.join(runDirectory, 'REPORT.md')}`);
}

module.exports = { parseArguments, normalizeFeatureCollection, normalizeGeometry, fetchBuffer, metadataDownloadUrl };

if (require.main === module) {
  main().catch((error) => {
    console.error('[fetch-geoboundaries-adm1] Failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
