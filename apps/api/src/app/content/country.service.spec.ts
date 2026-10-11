import { NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { countries, countryImages } from '@database';
import { ContentService } from './content.service';

const row = {
  code: 'VN' as const,
  translations: [
    { locale: 'en' as const, name: 'Vietnam', description: '<p>Discover Vietnam</p>', visa: '<p>Visa EN</p>', weather: '<p>Weather EN</p>' },
    { locale: 'vi' as const, name: 'Việt Nam', description: '<p>Khám phá Việt Nam</p>', visa: null, weather: null },
  ],
  imageLinks: [
    { role: 'gallery' as const, sortOrder: 1, image: { id: 'gallery-id', url: 'https://images.example.com/vn.webp', altText: null } },
    { role: 'cover' as const, sortOrder: 0, image: { id: 'cover-id', url: '/uploads/countries/vn.webp', altText: 'Vietnam cover' } },
  ],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-02-01T00:00:00.000Z'),
};

function createService() {
  const findMany = jest.fn().mockResolvedValue([row]);
  const findFirst = jest.fn().mockResolvedValue(row);
  const from = jest.fn().mockResolvedValue([{ value: 3 }]);
  const db = { select: jest.fn().mockReturnValue({ from }), query: { countries: { findMany, findFirst } } };
  return { service: new ContentService(db as never, { maxPageSize: 2 } as never), findMany, findFirst, from };
}

describe('ContentService countries', () => {
  it.each(['en', 'vi'] as const)('returns localized country content and ordered images in list/detail for %s', async (locale) => {
    const { service } = createService();
    const list = await service.countries(locale, 1);
    const detail = await service.country('VN', locale);
    expect(list.data[0]).toEqual(detail.data);
    expect(detail.data).toEqual({
      code: 'VN', name: locale === 'en' ? 'Vietnam' : 'Việt Nam',
      description: locale === 'en' ? '<p>Discover Vietnam</p>' : '<p>Khám phá Việt Nam</p>',
      visa: locale === 'en' ? '<p>Visa EN</p>' : null,
      weather: locale === 'en' ? '<p>Weather EN</p>' : null,
      locale: { requested: locale, effective: locale, fallback: false },
      images: [
        { id: 'cover-id', url: '/uploads/countries/vn.webp', altText: 'Vietnam cover', role: 'cover', sortOrder: 0 },
        { id: 'gallery-id', url: 'https://images.example.com/vn.webp', altText: null, role: 'gallery', sortOrder: 1 },
      ],
      createdAt: row.createdAt, updatedAt: row.updatedAt,
    });
    expect(detail.data).not.toHaveProperty('destinations');
    expect(detail.data).not.toHaveProperty('tours');
    expect(detail.data).not.toHaveProperty('provinces');
  });

  it('falls back to the complete English translation when Vietnamese is missing', async () => {
    const { service, findMany, findFirst } = createService();
    const englishOnly = { ...row, translations: [row.translations[0]] };
    findMany.mockResolvedValue([englishOnly]);
    findFirst.mockResolvedValue(englishOnly);
    const list = await service.countries('vi', 1);
    const detail = await service.country('VN', 'vi');
    expect(list.data[0]).toEqual(detail.data);
    expect(detail.data).toMatchObject({ name: 'Vietnam', visa: '<p>Visa EN</p>', weather: '<p>Weather EN</p>',
      locale: { requested: 'vi', effective: 'en', fallback: true } });
  });

  it('returns all countries without a limit, ignoring page and the server page-size cap', async () => {
    const { service, findMany } = createService();
    expect((await service.countries('en', 4)).meta).toEqual({ page: 1, limit: 3, total: 3, totalPages: 1 });
    const options = findMany.mock.calls[0][0];
    expect(options).not.toHaveProperty('limit');
    expect(options).not.toHaveProperty('offset');
    const dialect = new PgDialect();
    expect(dialect.sqlToQuery(options.orderBy(countries, { asc })[0]).sql).toContain('"countries"."code" asc');
    expect(dialect.sqlToQuery(options.with.imageLinks.orderBy(countryImages, { asc })[0]).sql).toContain('"country_images"."sort_order" asc');
  });

  it('applies explicit pagination and the server page-size cap', async () => {
    const { service, findMany } = createService();
    expect((await service.countries('en', 2, 100)).meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ limit: 2, offset: 2 }));
  });

  it('looks up a country by code rather than a UUID', async () => {
    const { service, findFirst } = createService();
    await service.country('CB', 'en');
    const where = findFirst.mock.calls[0][0].where(countries, { eq });
    const query = new PgDialect().sqlToQuery(where);
    expect(query.sql).toContain('"countries"."code"');
    expect(query.params).toEqual(['CB']);
  });

  it('returns an empty list with finite metadata when no countries exist', async () => {
    const { service, findMany, from } = createService();
    findMany.mockResolvedValue([]);
    from.mockResolvedValue([{ value: 0 }]);
    expect(await service.countries('en', 1)).toEqual({ data: [], meta: { page: 1, limit: 0, total: 0, totalPages: 1 } });
  });

  it('returns null optional content and an empty images array', async () => {
    const { service, findFirst } = createService();
    findFirst.mockResolvedValue({ ...row, imageLinks: [], translations: [{ ...row.translations[0], description: null, visa: '', weather: null }] });
    expect((await service.country('VN', 'en')).data).toMatchObject({ description: null, visa: null, weather: null, images: [] });
  });

  it('omits untranslated records from lists and returns 404 for missing detail translations', async () => {
    const { service, findMany, findFirst } = createService();
    const untranslated = { ...row, translations: [] };
    findMany.mockResolvedValue([untranslated]);
    findFirst.mockResolvedValue(untranslated);
    expect((await service.countries('en', 1)).data).toEqual([]);
    await expect(service.country('VN', 'en')).rejects.toBeInstanceOf(NotFoundException);
    findFirst.mockResolvedValue(undefined);
    await expect(service.country('VN', 'en')).rejects.toBeInstanceOf(NotFoundException);
  });
});
