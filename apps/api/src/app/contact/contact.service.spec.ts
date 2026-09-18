import {
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { ApiEnvironment } from '../config/env';
import { ContactService } from './contact.service';

const environment = {
  brevoApiKey: 'secret-key',
  brevoSenderEmail: 'verified@example.com',
  brevoSenderName: 'Travel Website',
  contactRecipientSettingKey: 'contact_email',
} as ApiEnvironment;

function createService(
  translations: Array<{ locale: 'vi' | 'en'; value: string }>,
  type: 'text' | 'image' | 'video' = 'text',
) {
  const findFirst = jest.fn().mockResolvedValue({
    key: 'contact_email',
    type,
    translations,
  });
  const db = { query: { siteSettings: { findFirst } } };
  return { service: new ContactService(db as never, environment), findFirst };
}

describe('ContactService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('prefers the Vietnamese recipient and sends an escaped Brevo payload', async () => {
    const { service, findFirst } = createService([
      { locale: 'en', value: 'english@example.com' },
      { locale: 'vi', value: ' vietnamese@example.com ' },
    ]);
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 201 });
    global.fetch = fetchMock as typeof fetch;

    await expect(
      service.send({
        name: '<Visitor & Friend>',
        email: 'visitor@example.com',
        touristArrivals: 3,
        message: '<script>alert("x")</script>',
      }),
    ).resolves.toEqual({ data: { sent: true } });

    expect(findFirst).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload).toMatchObject({
      sender: { email: 'verified@example.com', name: 'Travel Website' },
      to: [{ email: 'vietnamese@example.com' }],
      subject: 'New travel enquiry',
      replyTo: { email: 'visitor@example.com', name: '<Visitor & Friend>' },
    });
    expect(payload.htmlContent).toContain('<!doctype html>');
    expect(payload.textContent).toContain('Email: visitor@example.com');
    expect(options.headers['api-key']).toBe('secret-key');
  });

  it('falls back to the first nonblank translation and supports an empty submission', async () => {
    const { service } = createService([
      { locale: 'en', value: 'fallback@example.com' },
      { locale: 'vi', value: '  ' },
    ]);
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 201 });
    global.fetch = fetchMock as typeof fetch;

    await expect(service.send({})).resolves.toEqual({ data: { sent: true } });

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.to).toEqual([{ email: 'fallback@example.com' }]);
    expect(payload.replyTo).toBeUndefined();
    expect(payload.textContent).toContain('Name: Not provided');
    expect(payload.textContent).toContain('Tourist arrivals: Not provided');
  });

  it.each([
    [[], 'text'],
    [[{ locale: 'vi', value: 'not-an-email' }], 'text'],
    [[{ locale: 'vi', value: 'recipient@example.com' }], 'image'],
  ] as const)(
    'fails safely for invalid recipient configuration',
    async (translations, type) => {
      const { service } = createService([...translations], type);
      global.fetch = jest.fn() as typeof fetch;
      await expect(service.send({})).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );

  it('maps a Brevo rejection to a safe service-unavailable error', async () => {
    const { service } = createService([
      { locale: 'vi', value: 'recipient@example.com' },
    ]);
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 401 }) as typeof fetch;

    await expect(service.send({})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
