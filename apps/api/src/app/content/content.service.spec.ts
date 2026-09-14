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

describe('ContentService destination tour images', () => {
  const destinationId = '3db059d1-02af-4a8d-9506-696a691bf3e9';
  const tourId = 'b2a985d1-2a16-43da-848f-c533aa56ae3c';
  const destinationRow = {
    id: destinationId,
    country: 'VN',
    translations: [{ locale: 'vi', name: 'Hội An', description: 'Phố cổ Hội An' }],
    wardLinks: [],
    tourLinks: [{
      tour: {
        id: tourId,
        imageLinks: [
          {
            role: 'cover',
            sortOrder: 0,
            image: { id: '8642d66c-30c8-4703-bb17-4ef65e5707ba', url: '/uploads/tours/cover.webp', altText: 'Ảnh bìa' },
          },
          {
            role: 'gallery',
            sortOrder: 1,
            image: { id: 'c07ca66f-ac4f-4779-bfc2-25923011d63a', url: 'https://images.example.com/gallery.webp', altText: null },
          },
        ],
      },
    }],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  function createService(row = destinationRow) {
    const db = {
      select: jest.fn().mockReturnValue({ from: jest.fn().mockResolvedValue([{ value: 1 }]) }),
      query: {
        destinations: {
          findMany: jest.fn().mockResolvedValue([row]),
          findFirst: jest.fn().mockResolvedValue(row),
        },
      },
    };
    const env = { maxPageSize: 100, uploadPublicBaseUrl: 'https://api.example.com' };
    return new ContentService(db as never, env as never);
  }

  it('returns linked tours and their ordered images in destination list and detail responses', async () => {
    const service = createService();

    const list = await service.destinations('vi', 1, 20);
    const detail = await service.destination(destinationId, 'vi');

    const expectedTours = [{
      id: tourId,
      images: [
        {
          id: '8642d66c-30c8-4703-bb17-4ef65e5707ba',
          url: 'https://api.example.com/uploads/tours/cover.webp',
          altText: 'Ảnh bìa',
          role: 'cover',
          sortOrder: 0,
        },
        {
          id: 'c07ca66f-ac4f-4779-bfc2-25923011d63a',
          url: 'https://images.example.com/gallery.webp',
          altText: null,
          role: 'gallery',
          sortOrder: 1,
        },
      ],
    }];
    expect(list.data[0]).toHaveProperty('tours', expectedTours);
    expect(detail.data).toHaveProperty('tours', expectedTours);
  });

  it('returns an empty tours array when a destination has no linked tours', async () => {
    const service = createService({ ...destinationRow, tourLinks: [] });

    const detail = await service.destination(destinationId, 'vi');

    expect(detail.data.tours).toEqual([]);
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
