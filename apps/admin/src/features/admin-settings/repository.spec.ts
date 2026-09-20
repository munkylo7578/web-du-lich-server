import { db, siteSettings } from '@database';
import { getOperators } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { Setting } from '@/domains/setting/domain';
import { DrizzleSettingRepository, listAdminSettings } from './repository';

jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@database', () => ({
  ...jest.requireActual('../../../../../libs/database/src/schema'),
  db: { select: jest.fn(), query: { siteSettings: { findMany: jest.fn() } }, transaction: jest.fn() },
}));
jest.mock('@/features/shared/media-cleanup', () => ({ removeUnreferencedMediaFiles: jest.fn() }));

const findMany = jest.mocked(db.query.siteSettings.findMany);
const date = new Date('2026-01-01T00:00:00Z');
const row = { key: 'site.title', category: 'home', type: 'text', value: null, description: null,
  canDelete: true, createdAt: date, updatedAt: date,
  translations: [{ locale: 'vi', value: 'Trang chủ' }],
};

beforeEach(() => jest.clearAllMocks());

function mockListQueries(total = 1, keys = [{ key: row.key }]) {
  const where = jest.fn();
  const builder = {
    from: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where,
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockResolvedValue(keys),
  };
  where.mockResolvedValueOnce([{ total }]).mockReturnValueOnce(builder);
  jest.mocked(db.select).mockReturnValue(builder as never);
  return builder;
}

describe('settings repository category', () => {
  it.each(['home', 'general'] as const)('filters admin and domain lists by %s at the database', async (category) => {
    const builder = mockListQueries();
    findMany.mockResolvedValue([{ ...row, category }] as never);
    const result = await listAdminSettings(category);
    expect(result.items[0]).toMatchObject({ category, createdAt: date.toISOString(), translations: { vi: 'Trang chủ' } });
    expect(result).toMatchObject({ total: 1, page: 1, pageSize: 10, totalPages: 1 });
    for (const [condition] of builder.where.mock.calls) {
      expect(new PgDialect().sqlToQuery(condition)).toMatchObject({
        sql: '"site_settings"."category" = $1',
        params: [category],
      });
    }
    const hydrateWhere = findMany.mock.calls[0][0]?.where;
    if (typeof hydrateWhere !== 'function') throw new Error('Expected a key filter');
    const within = jest.fn();
    hydrateWhere(siteSettings, { ...getOperators(), inArray: within });
    expect(within).toHaveBeenCalledWith(siteSettings.key, [row.key]);

    findMany.mockClear();
    expect((await new DrizzleSettingRepository().list(category))[0].toSnapshot().category).toBe(category);
    for (const [options] of findMany.mock.calls) {
      const equals = jest.fn();
      const where = options?.where;
      if (typeof where !== 'function') throw new Error('Expected a category filter');
      where(siteSettings, { ...getOperators(), eq: equals });
      expect(equals).toHaveBeenCalledWith(siteSettings.category, category);
    }
  });

  it('never queries an unscoped list for an invalid category', async () => {
    await expect(listAdminSettings('unknown' as never)).rejects.toThrow('Nhóm setting');
    await expect(new DrizzleSettingRepository().list(undefined as never)).rejects.toThrow('Nhóm setting');
    expect(findMany).not.toHaveBeenCalled();
    expect(db.select).not.toHaveBeenCalled();
  });

  it.each(['text', 'plain_text'] as const)('persists %s translations and category without overwriting category on conflict', async (type) => {
    const onConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
    const values = jest.fn().mockReturnValue({ onConflictDoUpdate });
    const tx = {
      select: jest.fn(() => ({ from: jest.fn(() => ({ where: jest.fn(() => ({ for: jest.fn().mockResolvedValue([]) })) })) })),
      insert: jest.fn(() => ({ values })),
      delete: jest.fn(() => ({ where: jest.fn().mockResolvedValue(undefined) })),
    };
    jest.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));
    const setting = Setting.create({ key: row.key, category: 'home', type, translations: { vi: 'Trang chủ' }, canDelete: true });
    await new DrizzleSettingRepository().save(setting);
    expect(values.mock.calls[0][0]).toMatchObject({ category: 'home', key: row.key });
    expect(onConflictDoUpdate.mock.calls[0][0].target).toBe(siteSettings.key);
    expect(onConflictDoUpdate.mock.calls[0][0].set).not.toHaveProperty('category');
    expect(values.mock.calls[1][0]).toEqual([expect.objectContaining({ settingKey: row.key, locale: 'vi', value: 'Trang chủ' })]);
  });
});

describe('settings search SQL', () => {
  it.each(['home', 'general'] as const)('casts the enum to text in both %s list queries', async (category) => {
    const builder = mockListQueries(0, []);
    const result = await listAdminSettings(category, { query: ' Image ' });

    expect(builder.where).toHaveBeenCalledTimes(2);
    expect(builder.where.mock.calls[0][0]).toBe(builder.where.mock.calls[1][0]);
    for (const [condition] of builder.where.mock.calls) {
      const compiled = new PgDialect().sqlToQuery(condition);
      expect(compiled.sql).toContain('"site_settings"."type"::text ilike');
      expect(compiled.sql).not.toContain('"site_settings"."type" ilike');
      for (const column of ['key', 'description', 'value']) {
        expect(compiled.sql).toContain(`"site_settings"."${column}" ilike`);
      }
      expect(compiled.sql).toContain('"site_setting_translations"."value" ilike');
      expect(compiled.sql).toContain('"site_settings"."category" = $1 and');
      expect(compiled.params).toEqual([category, ...Array(5).fill('%Image%')]);
    }
    expect(result).toMatchObject({ items: [], total: 0, page: 1 });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('omits text matching for a blank search', async () => {
    const builder = mockListQueries(0, []);
    await listAdminSettings('home', { query: '   ' });
    for (const [condition] of builder.where.mock.calls) {
      const compiled = new PgDialect().sqlToQuery(condition);
      expect(compiled.sql).not.toContain('ilike');
      expect(compiled.params).toEqual(['home']);
    }
  });

  it('keeps search input parameterized', async () => {
    const builder = mockListQueries(0, []);
    const query = "image' OR 1=1 --";
    await listAdminSettings('home', { query });
    const compiled = new PgDialect().sqlToQuery(builder.where.mock.calls[0][0]);
    expect(compiled.sql).not.toContain(query);
    expect(compiled.params).toEqual(['home', ...Array(5).fill(`%${query}%`)]);
  });
});
