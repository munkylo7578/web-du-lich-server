import {
  InternalServerErrorException,
  Logger,
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
  type: 'text' | 'plain_text' | 'image' | 'video' = 'text',
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

  describe('sendJourney', () => {
    it.each([
      [undefined, 'vi', 'Số lượng vé', 'Số điện thoại'],
      ['vi', 'vi', 'Số lượng vé', 'Số điện thoại'],
      ['en', 'en', 'Number of ticket', 'Phone number'],
    ] as const)('maps journey fields and uses locale %s with the existing recipient', async (locale, language, ticketLabel, phoneLabel) => {
      const { service } = createService([
        { locale: 'en', value: 'english@example.com' },
        { locale: 'vi', value: ' vietnamese@example.com ' },
      ], 'plain_text');
      const fetchMock = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = fetchMock as typeof fetch;
      await expect(service.sendJourney({
        locale, name: 'Visitor', email: 'visitor@example.com',
        phoneNumber: '+84912345678', numberOfTickets: 4, message: 'Travel plans',
      })).resolves.toEqual({ data: { sent: true } });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.brevo.com/v3/smtp/email');
      expect(options).toMatchObject({ method: 'POST', headers: { 'api-key': environment.brevoApiKey } });
      expect(options.signal).toBeInstanceOf(AbortSignal);
      const payload = JSON.parse(options.body);
      expect(payload).toMatchObject({
        to: [{ email: 'vietnamese@example.com' }],
        sender: { email: environment.brevoSenderEmail, name: environment.brevoSenderName },
        replyTo: { email: 'visitor@example.com', name: 'Visitor' },
      });
      expect(payload.htmlContent).toContain(`<html lang="${language}">`);
      expect(payload.textContent).toContain(`${ticketLabel}: 4`);
      expect(payload.textContent).toContain(`${phoneLabel}: +84912345678`);
      expect(payload.textContent).toContain('Travel plans');
    });

    it('sends an empty journey enquiry without reply-to and falls back to a nonblank recipient', async () => {
      const { service } = createService([
        { locale: 'en', value: 'fallback@example.com' }, { locale: 'vi', value: ' ' },
      ]);
      const fetchMock = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = fetchMock as typeof fetch;
      await expect(service.sendJourney({})).resolves.toEqual({ data: { sent: true } });
      const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(payload.to).toEqual([{ email: 'fallback@example.com' }]);
      expect(payload.replyTo).toBeUndefined();
      expect(payload.textContent).toContain('Số lượng vé: Chưa cung cấp');
    });

    it('sets reply-to without a name when only email is provided', async () => {
      const { service } = createService([{ locale: 'vi', value: 'recipient@example.com' }]);
      const fetchMock = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = fetchMock as typeof fetch;
      await service.sendJourney({ email: 'visitor@example.com' });
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).replyTo).toEqual({ email: 'visitor@example.com' });
    });

    it('does not contact Brevo when the recipient is invalid', async () => {
      const { service } = createService([{ locale: 'vi', value: 'invalid' }]);
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      global.fetch = jest.fn() as typeof fetch;
      await expect(service.sendJourney({})).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it.each(['network', 'timeout', 'rejection', 'unreadable'])('maps a %s failure to service unavailable', async (failure) => {
      const { service } = createService([{ locale: 'vi', value: 'recipient@example.com' }]);
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      const fetchMock = jest.fn();
      if (failure === 'network' || failure === 'timeout') {
        fetchMock.mockRejectedValue(new Error(failure));
      } else {
        fetchMock.mockResolvedValue({ ok: false, status: 500, json: failure === 'unreadable'
          ? jest.fn().mockRejectedValue(new Error('Invalid JSON'))
          : jest.fn().mockResolvedValue({ code: 'provider_error' }) });
      }
      global.fetch = fetchMock as typeof fetch;
      await expect(service.sendJourney({})).rejects.toThrow('Email service unavailable');
    });

    it('redacts journey phone, ticket count and other sensitive fields from provider errors', async () => {
      const { service } = createService([{ locale: 'vi', value: 'recipient@example.com' }]);
      const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      const request = { name: 'Private visitor', email: 'visitor@example.com',
        phoneNumber: '+84912345678', numberOfTickets: 87654, message: 'Private travel plans' };
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400,
        json: jest.fn().mockResolvedValue({ code: 'invalid_parameter',
          message: `${environment.brevoApiKey}\n${Object.values(request).join(' ')}` }) }) as typeof fetch;
      await expect(service.sendJourney(request)).rejects.toBeInstanceOf(ServiceUnavailableException);
      const logged = String(log.mock.calls[0][0]);
      for (const value of [environment.brevoApiKey, ...Object.values(request)]) {
        expect(logged).not.toContain(String(value));
      }
      expect(logged).not.toContain('\n');
    });
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
        locale: 'en',
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

  it.each([
    [undefined, 'vi', 'Yêu cầu tư vấn du lịch mới', 'Họ và tên: Nguyễn Văn An'],
    ['vi', 'vi', 'Yêu cầu tư vấn du lịch mới', 'Họ và tên: Nguyễn Văn An'],
    ['en', 'en', 'New travel enquiry', 'Name: Nguyễn Văn An'],
  ] as const)(
    'selects the email language for locale %s without changing the recipient',
    async (locale, language, subject, nameField) => {
      const { service } = createService([
        { locale: 'en', value: 'english@example.com' },
        { locale: 'vi', value: 'vietnamese@example.com' },
      ]);
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 201 });
      global.fetch = fetchMock as typeof fetch;

      await service.send({ ...(locale ? { locale } : {}), name: 'Nguyễn Văn An' });

      const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(payload.subject).toBe(subject);
      expect(payload.htmlContent).toContain(`<html lang="${language}">`);
      expect(payload.htmlContent).toContain(subject);
      expect(payload.textContent).toContain(nameField);
      expect(payload.to).toEqual([{ email: 'vietnamese@example.com' }]);
    },
  );

  it('uses a plain-text recipient without HTML wrapping', async () => {
    const { service } = createService([{ locale: 'vi', value: ' Sales@kindtraveldmc.com ' }], 'plain_text');
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 201 });
    global.fetch = fetchMock as typeof fetch;
    await expect(service.send({})).resolves.toEqual({ data: { sent: true } });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).to).toEqual([{ email: 'Sales@kindtraveldmc.com' }]);
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
    expect(payload.textContent).toContain('Họ và tên: Chưa cung cấp');
    expect(payload.textContent).toContain('Số lượng khách: Chưa cung cấp');
  });

  it.each([
    [[], 'text'],
    [[{ locale: 'vi', value: 'not-an-email' }], 'text'],
    [[{ locale: 'vi', value: '<p>Sales@kindtraveldmc.com</p>' }], 'text'],
    [[{ locale: 'vi', value: '<p>Sales@kindtraveldmc.com</p>' }], 'plain_text'],
    [[{ locale: 'vi', value: 'one@example.com,two@example.com' }], 'plain_text'],
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
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          code: 'invalid_parameter',
          message: 'Sender verified@example.com is not authorized',
        }),
      }) as typeof fetch;

    await expect(service.send({})).rejects.toThrow('Email service unavailable');
    expect(log).toHaveBeenCalledWith(
      'Brevo rejected contact email with status 400: {"code":"invalid_parameter","message":"Sender [redacted-email] is not authorized"}',
    );
  });

  it('redacts sensitive values and ignores extra provider response fields', async () => {
    const { service } = createService([
      { locale: 'vi', value: 'recipient@example.com' },
    ]);
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const request = {
      email: 'visitor@example.com',
      name: 'Visitor Name',
      mobile: '+84912345678',
      message: 'Private travel plans',
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({
        code: 'invalid_parameter',
        message: `${environment.brevoApiKey}\n${Object.values(request).join(' ')}`,
        payload: request,
      }),
    }) as typeof fetch;

    await expect(service.send(request)).rejects.toBeInstanceOf(ServiceUnavailableException);
    const logged = String(log.mock.calls[0][0]);
    for (const sensitive of [environment.brevoApiKey, ...Object.values(request)]) {
      expect(logged).not.toContain(sensitive);
    }
    expect(logged).not.toContain('\n');
    expect(logged).not.toContain('payload');
    expect(logged).toContain('invalid_parameter');
  });

  it.each([null, 'not an object', { message: 123 }, { message: 'x'.repeat(2000) }])(
    'handles unexpected provider error details safely',
    async (body) => {
      const { service } = createService([{ locale: 'vi', value: 'recipient@example.com' }]);
      const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue(body),
      }) as typeof fetch;

      await expect(service.send({})).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(String(log.mock.calls[0][0]).length).toBeLessThan(1200);
    },
  );

  it('preserves the service error when the provider body cannot be read as JSON', async () => {
    const { service } = createService([{ locale: 'vi', value: 'recipient@example.com' }]);
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
    }) as typeof fetch;

    await expect(service.send({})).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(log).toHaveBeenCalledWith(
      'Brevo rejected contact email with status 400: Error response unavailable or not JSON',
    );
  });
});
