import { loadEnvironment } from './env';

describe('loadEnvironment', () => {
  it('parses valid server configuration and key rotation', () => {
    const env = loadEnvironment({
      DATABASE_URL: 'postgres://localhost/test',
      API_KEYS: `${'a'.repeat(32)},${'b'.repeat(40)}`,
      API_PORT: '4000',
      API_CORS_ORIGINS: 'https://one.example, https://two.example',
    });
    expect(env.port).toBe(4000);
    expect(env.apiKeys).toHaveLength(2);
    expect(env.corsOrigins).toEqual(['https://one.example', 'https://two.example']);
  });

  it('rejects missing or short keys', () => {
    expect(() => loadEnvironment({ DATABASE_URL: 'postgres://localhost/test', API_KEYS: 'short' })).toThrow('API_KEYS');
  });
});
