export type ApiEnvironment = {
  databaseUrl: string;
  apiKeys: string[];
  port: number;
  maxPageSize: number;
  rateLimitTtlMs: number;
  rateLimitLimit: number;
  corsOrigins: string[];
  trustProxy: boolean;
  publicSettingKeys: string[];
  docsEnabled: boolean;
  uploadPublicBaseUrl: string;
};

function integer(name: string, value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

function csv(value: string | undefined) {
  return (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
}

export function loadEnvironment(env: NodeJS.ProcessEnv = process.env): ApiEnvironment {
  const databaseUrl = env['DATABASE_URL']?.trim();
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const apiKeys = csv(env['API_KEYS']);
  if (apiKeys.length === 0 || apiKeys.some((key) => key.length < 32)) {
    throw new Error('API_KEYS must contain at least one comma-separated key of 32 or more characters');
  }

  return {
    databaseUrl,
    apiKeys,
    port: integer('API_PORT', env['API_PORT'], 3001, 1, 65535),
    maxPageSize: integer('API_MAX_PAGE_SIZE', env['API_MAX_PAGE_SIZE'], 100, 1, 500),
    rateLimitTtlMs: integer('API_RATE_LIMIT_TTL_MS', env['API_RATE_LIMIT_TTL_MS'], 60_000, 1_000, 3_600_000),
    rateLimitLimit: integer('API_RATE_LIMIT_LIMIT', env['API_RATE_LIMIT_LIMIT'], 120, 1, 100_000),
    corsOrigins: csv(env['API_CORS_ORIGINS']),
    trustProxy: env['API_TRUST_PROXY'] === '1',
    publicSettingKeys: csv(env['API_PUBLIC_SETTING_KEYS']),
    docsEnabled: env['API_DOCS_ENABLED'] !== 'false',
    uploadPublicBaseUrl: (env['UPLOAD_PUBLIC_BASE_URL'] ?? '/uploads').replace(/\/$/, ''),
  };
}

export const API_ENV = Symbol('API_ENV');
