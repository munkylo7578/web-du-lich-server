import { ContentService } from './content.service';

describe('ContentService tour departure start month', () => {
  function createService(departureStartMonth: number | null) {
    const row = {
      id: 'b2a985d1-2a16-43da-848f-c533aa56ae3c',
      departureStartMonth,
      translations: [{ locale: 'vi', name: 'Tour thử nghiệm', description: null }],
      planRows: [],
      imageLinks: [],
      destinationLinks: [],
      serviceLinks: [],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const db = {
      select: jest.fn().mockReturnValue({ from: jest.fn().mockResolvedValue([{ value: 1 }]) }),
      query: {
        tours: {
          findMany: jest.fn().mockResolvedValue([row]),
          findFirst: jest.fn().mockResolvedValue(row),
        },
      },
    };
    return { service: new ContentService(db as never, { maxPageSize: 100 } as never), id: row.id };
  }

  it.each([1, 6, 12, null])('returns %s in list and detail responses, including locale fallback', async (month) => {
    const { service, id } = createService(month);
    for (const locale of ['vi', 'en'] as const) {
      const list = await service.tours(locale, 1, 20);
      const detail = await service.tour(id, locale);
      expect(list.data[0]).toHaveProperty('departureStartMonth', month);
      expect(detail.data).toHaveProperty('departureStartMonth', month);
      expect(JSON.parse(JSON.stringify(detail.data))).toHaveProperty('departureStartMonth', month);
    }
  });
});

describe('ContentService setting localization', () => {
  const env = {
    publicSettingKeys: ['site.footer'],
  };

  function createService(rows: unknown[]) {
    const db = {
      query: {
        siteSettings: {
          findMany: jest.fn().mockResolvedValue(rows),
          findFirst: jest.fn().mockResolvedValue(rows[0]),
        },
      },
    };

    return new ContentService(db as never, env as never);
  }

  const base = {
    key: 'site.footer',
    description: null,
    canDelete: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  it('returns the requested English text translation', async () => {
    const service = createService([{
      ...base,
      type: 'text',
      value: null,
      translations: [
        { settingKey: base.key, locale: 'vi', value: '<p>Tiếng Việt</p>' },
        { settingKey: base.key, locale: 'en', value: '<p>English</p>' },
      ],
    }]);

    const result = await service.setting(base.key, 'en');

    expect(result.data.value).toBe('<p>English</p>');
    expect(result.meta.locale).toEqual({ requested: 'en', effective: 'en', fallback: false });
  });

  it('falls back from English to Vietnamese when English is missing', async () => {
    const service = createService([{
      ...base,
      type: 'text',
      value: null,
      translations: [{ settingKey: base.key, locale: 'vi', value: '<p>Tiếng Việt</p>' }],
    }]);

    const result = await service.setting(base.key, 'en');

    expect(result.data.value).toBe('<p>Tiếng Việt</p>');
    expect(result.meta.locale).toEqual({ requested: 'en', effective: 'vi', fallback: true });
  });

  it('keeps image values independent from locale', async () => {
    const service = createService([{
      ...base,
      type: 'image',
      value: '/uploads/settings/logo.webp',
      translations: [],
    }]);

    const result = await service.setting(base.key, 'en');

    expect(result.data.value).toBe('/uploads/settings/logo.webp');
    expect(result.meta.locale).toEqual({ requested: 'en', effective: 'en', fallback: false });
  });
});
