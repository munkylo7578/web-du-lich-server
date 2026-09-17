import { ContentService } from './content.service';
import { PgDialect } from 'drizzle-orm/pg-core';

describe('ContentService tour departure start month', () => {
  function createService(departureStartMonth: number | null) {
    const row = {
      id: 'b2a985d1-2a16-43da-848f-c533aa56ae3c',
      departureStartMonth,
      translations: [
        { locale: 'vi', name: 'Tour thử nghiệm', description: null },
      ],
      planRows: [],
      imageLinks: [],
      destinationLinks: [],
      serviceLinks: [],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const db = {
      select: jest
        .fn()
        .mockReturnValue({ from: jest.fn().mockResolvedValue([{ value: 1 }]) }),
      query: {
        tours: {
          findMany: jest.fn().mockResolvedValue([row]),
          findFirst: jest.fn().mockResolvedValue(row),
        },
      },
    };
    return {
      service: new ContentService(db as never, { maxPageSize: 100 } as never),
      id: row.id,
    };
  }

  it.each([1, 6, 12, null])(
    'returns %s in list and detail responses, including locale fallback',
    async (month) => {
      const { service, id } = createService(month);
      for (const locale of ['vi', 'en'] as const) {
        const list = await service.tours(locale, 1, 20);
        const detail = await service.tour(id, locale);
        expect(list.data[0]).toHaveProperty('departureStartMonth', month);
        expect(detail.data).toHaveProperty('departureStartMonth', month);
        expect(JSON.parse(JSON.stringify(detail.data))).toHaveProperty(
          'departureStartMonth',
          month,
        );
      }
    },
  );
});

describe('ContentService tour list filters', () => {
  const row = {
    id: 'b2a985d1-2a16-43da-848f-c533aa56ae3c',
    departureStartMonth: 6,
    translations: [
      { locale: 'vi', name: 'Hội An mùa hè', description: null },
    ],
    planRows: [],
    imageLinks: [],
    destinationLinks: [],
    serviceLinks: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  function createService(total = 1) {
    const countWhere = jest.fn().mockResolvedValue([{ value: total }]);
    const countFrom = jest.fn().mockReturnValue({ where: countWhere });
    const findMany = jest.fn().mockResolvedValue([row]);
    const db = {
      select: jest.fn().mockReturnValue({ from: countFrom }),
      query: { tours: { findMany } },
    };
    return {
      service: new ContentService(
        db as never,
        { maxPageSize: 100 } as never,
      ),
      countWhere,
      findMany,
    };
  }

  function compileWhere(where: unknown) {
    return new PgDialect().sqlToQuery(where as never);
  }

  it('searches tour and destination names in requested and Vietnamese fallback locales', async () => {
    const { service, countWhere, findMany } = createService(7);

    const result = await service.tours('en', 2, 20, { search: 'Hội An' });

    const options = findMany.mock.calls[0][0];
    const query = compileWhere(options.where);
    expect(query.sql).toContain('tour_translations');
    expect(query.sql).toContain('destination_translations');
    expect(query.sql).toContain('tour_destinations');
    expect(query.sql.toLowerCase()).toContain('ilike');
    expect(query.sql.toLowerCase()).toContain(' or ');
    expect(query.params).toEqual(
      expect.arrayContaining(['en', 'vi', '%Hội An%']),
    );
    expect(countWhere).toHaveBeenCalledWith(options.where);
    expect(result.meta).toEqual({
      page: 2,
      limit: 20,
      total: 7,
      totalPages: 1,
    });
  });

  it('uses only Vietnamese once when it is the requested locale', async () => {
    const { service, findMany } = createService();

    await service.tours('vi', 1, 20, { search: 'Huế' });

    const query = compileWhere(findMany.mock.calls[0][0].where);
    expect(query.params.filter((parameter) => parameter === 'vi')).toHaveLength(2);
    expect(query.params).not.toContain('en');
  });

  it('supports departure month without search', async () => {
    const { service, findMany } = createService();

    await service.tours('vi', 1, 20, { departureStartMonth: 6 });

    const query = compileWhere(findMany.mock.calls[0][0].where);
    expect(query.sql).toContain('departure_start_month');
    expect(query.params).toContain(6);
    expect(query.sql).not.toContain('tour_translations');
  });

  it('combines search and departure month with AND', async () => {
    const { service, findMany } = createService();

    await service.tours('en', 1, 20, {
      search: 'Da Nang',
      departureStartMonth: 12,
    });

    const query = compileWhere(findMany.mock.calls[0][0].where);
    expect(query.sql.toLowerCase()).toContain(' and ');
    expect(query.params).toEqual(
      expect.arrayContaining(['en', 'vi', '%Da Nang%', 12]),
    );
  });

  it('escapes SQL LIKE wildcard characters in search input', async () => {
    const { service, findMany } = createService();

    await service.tours('vi', 1, 20, { search: '50%_off' });

    const query = compileWhere(findMany.mock.calls[0][0].where);
    expect(query.params).toContain('%50\\%\\_off%');
  });
});

describe('ContentService destination tour images', () => {
  const destinationId = '3db059d1-02af-4a8d-9506-696a691bf3e9';
  const tourId = 'b2a985d1-2a16-43da-848f-c533aa56ae3c';
  const destinationRow = {
    id: destinationId,
    country: 'VN',
    translations: [
      { locale: 'vi', name: 'Hội An', description: 'Phố cổ Hội An' },
    ],
    wardLinks: [],
    tourLinks: [
      {
        tour: {
          id: tourId,
          imageLinks: [
            {
              role: 'cover',
              sortOrder: 0,
              image: {
                id: '8642d66c-30c8-4703-bb17-4ef65e5707ba',
                url: '/uploads/tours/cover.webp',
                altText: 'Ảnh bìa',
              },
            },
            {
              role: 'gallery',
              sortOrder: 1,
              image: {
                id: 'c07ca66f-ac4f-4779-bfc2-25923011d63a',
                url: 'https://images.example.com/gallery.webp',
                altText: null,
              },
            },
          ],
        },
      },
    ],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  function createService(row = destinationRow) {
    const coordinateRows = (row.wardLinks ?? []).map(
      ({ ward }: { ward: { code: string } }) => ({
        wardCode: ward.code,
        latitude: 15.8801,
        longitude: 108.338,
      }),
    );
    const coordinateWhere = jest.fn().mockResolvedValue(coordinateRows);
    const coordinateFrom = jest
      .fn()
      .mockReturnValue({ where: coordinateWhere });
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockResolvedValue([{ value: 1 }]),
        })
        .mockReturnValue({ from: coordinateFrom }),
      query: {
        destinations: {
          findMany: jest.fn().mockResolvedValue([row]),
          findFirst: jest.fn().mockResolvedValue(row),
        },
      },
    };
    const env = {
      maxPageSize: 100,
    };
    return new ContentService(db as never, env as never);
  }

  it('returns linked tours and their ordered images in destination list and detail responses', async () => {
    const service = createService();

    const list = await service.destinations('vi', 1, 20);
    const detail = await service.destination(destinationId, 'vi');

    const expectedTours = [
      {
        id: tourId,
        images: [
          {
            id: '8642d66c-30c8-4703-bb17-4ef65e5707ba',
            url: '/uploads/tours/cover.webp',
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
      },
    ];
    expect(list.data[0]).toHaveProperty('tours', expectedTours);
    expect(detail.data).toHaveProperty('tours', expectedTours);
  });

  it('returns an empty tours array when a destination has no linked tours', async () => {
    const service = createService({ ...destinationRow, tourLinks: [] });

    const detail = await service.destination(destinationId, 'vi');

    expect(detail.data.tours).toEqual([]);
  });

  it('returns representative GIS coordinates for wards in list and detail responses', async () => {
    const ward = {
      code: '20311',
      name: 'Minh An',
      nameEn: null,
      fullName: 'Phường Minh An',
      fullNameEn: null,
      province: { code: '49', name: 'Quảng Nam', nameEn: null },
    };
    const service = createService({ ...destinationRow, wardLinks: [{ ward }] });

    const list = await service.destinations('vi', 1, 20);
    const detail = await service.destination(destinationId, 'vi');

    expect(list.data[0]?.wards[0]).toMatchObject({
      latitude: 15.8801,
      longitude: 108.338,
    });
    expect(detail.data.wards[0]).toMatchObject({
      latitude: 15.8801,
      longitude: 108.338,
    });
  });

  it('returns null coordinates when a ward has no GIS geometry', async () => {
    const ward = {
      code: '20311',
      name: 'Minh An',
      nameEn: null,
      fullName: 'Phường Minh An',
      fullNameEn: null,
      province: null,
    };
    const service = createService({
      ...destinationRow,
      wardLinks: [{ ward: { ...ward, code: '' } }],
    });

    const detail = await service.destination(destinationId, 'vi');

    expect(detail.data.wards[0]).toMatchObject({
      latitude: null,
      longitude: null,
    });
  });
});

describe('ContentService destination list pagination', () => {
  const row = {
    id: '3db059d1-02af-4a8d-9506-696a691bf3e9',
    country: 'VN',
    translations: [{ locale: 'vi', name: 'Hội An', description: null }],
    wardLinks: [],
    tourLinks: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  function createService(rows: typeof row[], total: number) {
    const findMany = jest.fn().mockResolvedValue(rows);
    const db = {
      select: jest
        .fn()
        .mockReturnValue({ from: jest.fn().mockResolvedValue([{ value: total }]) }),
      query: { destinations: { findMany } },
    };
    return {
      service: new ContentService(
        db as never,
        { maxPageSize: 100 } as never,
      ),
      findMany,
    };
  }

  it('returns every destination and ignores page when limit is omitted', async () => {
    const { service, findMany } = createService([row], 1);

    const result = await service.destinations('vi', 9);

    expect(findMany.mock.calls[0][0]).not.toHaveProperty('limit');
    expect(findMany.mock.calls[0][0]).not.toHaveProperty('offset');
    expect(result.meta).toEqual({
      page: 1,
      limit: 1,
      total: 1,
      totalPages: 1,
    });
  });

  it('returns stable fetch-all metadata for an empty dataset', async () => {
    const { service } = createService([], 0);

    const result = await service.destinations('vi', 3);

    expect(result.data).toEqual([]);
    expect(result.meta).toEqual({
      page: 1,
      limit: 0,
      total: 0,
      totalPages: 1,
    });
  });

  it('preserves capped pagination when limit is explicitly supplied', async () => {
    const { service, findMany } = createService([row], 250);

    const result = await service.destinations('vi', 2, 150);

    expect(findMany.mock.calls[0][0]).toMatchObject({ limit: 100, offset: 100 });
    expect(result.meta).toEqual({
      page: 2,
      limit: 100,
      total: 250,
      totalPages: 3,
    });
  });
});

describe('ContentService service category', () => {
  const row = {
    id: '0fb0cc70-b8c4-45b4-9121-0e7241c2e9cb',
    category: 'transportation',
    translations: [{ locale: 'vi', name: 'Xe đưa đón', description: null }],
    imageLinks: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  it('returns category in service list and detail responses', async () => {
    const db = {
      select: jest
        .fn()
        .mockReturnValue({ from: jest.fn().mockResolvedValue([{ value: 1 }]) }),
      query: {
        services: {
          findMany: jest.fn().mockResolvedValue([row]),
          findFirst: jest.fn().mockResolvedValue(row),
        },
      },
    };
    const service = new ContentService(
      db as never,
      { maxPageSize: 100 } as never,
    );

    expect((await service.services('vi', 1, 20)).data[0]).toHaveProperty(
      'category',
      'transportation',
    );
    expect((await service.service(row.id, 'vi')).data).toHaveProperty(
      'category',
      'transportation',
    );
  });
});

describe('ContentService setting localization', () => {
  function createService(rows: unknown[]) {
    const findMany = jest.fn().mockResolvedValue(rows);
    const findFirst = jest.fn().mockResolvedValue(rows[0]);
    const db = {
      query: {
        siteSettings: {
          findMany,
          findFirst,
        },
      },
    };

    return {
      service: new ContentService(db as never, {} as never),
      findMany,
      findFirst,
    };
  }

  const base = {
    key: 'site.footer',
    description: null,
    canDelete: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  it('returns all settings without an environment allowlist', async () => {
    const rows = [
      {
        ...base,
        type: 'text',
        value: null,
        translations: [
          { settingKey: base.key, locale: 'vi', value: '<p>Chân trang</p>' },
        ],
      },
      {
        ...base,
        key: 'site.name',
        type: 'text',
        value: null,
        translations: [
          { settingKey: 'site.name', locale: 'vi', value: 'Travel' },
        ],
      },
    ];
    const { service, findMany } = createService(rows);

    const result = await service.settings('vi');

    expect(result.data.map((setting) => setting.key)).toEqual([
      'site.footer',
      'site.name',
    ]);
    expect(findMany).toHaveBeenCalledWith({
      orderBy: expect.any(Function),
      with: { translations: true },
    });
  });

  it('returns the requested English text translation', async () => {
    const { service } = createService([
      {
        ...base,
        type: 'text',
        value: null,
        translations: [
          { settingKey: base.key, locale: 'vi', value: '<p>Tiếng Việt</p>' },
          { settingKey: base.key, locale: 'en', value: '<p>English</p>' },
        ],
      },
    ]);

    const result = await service.setting(base.key, 'en');

    expect(result.data.value).toBe('<p>English</p>');
    expect(result.meta.locale).toEqual({
      requested: 'en',
      effective: 'en',
      fallback: false,
    });
  });

  it('falls back from English to Vietnamese when English is missing', async () => {
    const { service } = createService([
      {
        ...base,
        type: 'text',
        value: null,
        translations: [
          { settingKey: base.key, locale: 'vi', value: '<p>Tiếng Việt</p>' },
        ],
      },
    ]);

    const result = await service.setting(base.key, 'en');

    expect(result.data.value).toBe('<p>Tiếng Việt</p>');
    expect(result.meta.locale).toEqual({
      requested: 'en',
      effective: 'vi',
      fallback: true,
    });
  });

  it('keeps image values independent from locale', async () => {
    const { service } = createService([
      {
        ...base,
        type: 'image',
        value: '/uploads/settings/logo.webp',
        translations: [],
      },
    ]);

    const result = await service.setting(base.key, 'en');

    expect(result.data.value).toBe('/uploads/settings/logo.webp');
    expect(result.meta.locale).toEqual({
      requested: 'en',
      effective: 'en',
      fallback: false,
    });
  });
});
