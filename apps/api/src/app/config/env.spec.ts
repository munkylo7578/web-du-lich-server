import { loadEnvironment } from './env';

const validEnvironment = {
  DATABASE_URL: 'postgres://localhost/test',
  API_KEYS: `${'a'.repeat(32)},${'b'.repeat(40)}`,
  BREVO_API_KEY: 'brevo-secret',
  BREVO_SENDER_EMAIL: 'verified@example.com',
  BREVO_SENDER_NAME: 'Travel website',
  CONTACT_RECIPIENT_SETTING_KEY: 'contact_email',
};

describe('loadEnvironment', () => {
  it('parses valid server configuration and key rotation', () => {
    const env = loadEnvironment({
      ...validEnvironment,
      API_PORT: '4000',
      API_CORS_ORIGINS: 'https://one.example, https://two.example',
    });
    expect(env.port).toBe(4000);
    expect(env.apiKeys).toHaveLength(2);
    expect(env.corsOrigins).toEqual(['https://one.example', 'https://two.example']);
    expect(env).toMatchObject({
      brevoApiKey: 'brevo-secret',
      brevoSenderEmail: 'verified@example.com',
      brevoSenderName: 'Travel website',
      contactRecipientSettingKey: 'contact_email',
    });
  });

  it('rejects missing or short keys', () => {
    expect(() => loadEnvironment({ ...validEnvironment, API_KEYS: 'short' })).toThrow('API_KEYS');
  });

  it.each([
    'BREVO_API_KEY',
    'BREVO_SENDER_EMAIL',
    'BREVO_SENDER_NAME',
    'CONTACT_RECIPIENT_SETTING_KEY',
  ])('rejects a missing %s', (name) => {
    const environment = { ...validEnvironment, [name]: '' };
    expect(() => loadEnvironment(environment)).toThrow(name);
  });

  it('rejects an invalid sender email', () => {
    expect(() =>
      loadEnvironment({ ...validEnvironment, BREVO_SENDER_EMAIL: 'invalid' }),
    ).toThrow('BREVO_SENDER_EMAIL');
  });
});
