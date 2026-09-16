import { db, siteSettings } from '@database';
import { getOperators } from 'drizzle-orm';
import { Setting } from '@/domains/setting/domain';
import { DrizzleSettingRepository, listAdminSettings } from './repository';

jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@database', () => ({
  ...jest.requireActual('../../../../../libs/database/src/schema'),
  db: { query: { siteSettings: { findMany: jest.fn() } }, transaction: jest.fn() },
}));
jest.mock('@/features/shared/media-cleanup', () => ({ removeUnreferencedMediaFiles: jest.fn() }));

const findMany = jest.mocked(db.query.siteSettings.findMany);
const date = new Date('2026-01-01T00:00:00Z');
const row = { key: 'site.title', category: 'home', type: 'text', value: null, description: null,
  canDelete: true, createdAt: date, updatedAt: date,
  translations: [{ locale: 'vi', value: 'Trang chủ' }],
};

beforeEach(() => jest.clearAllMocks());

describe('settings repository category', () => {
  it.each(['home', 'general'] as const)('filters admin and domain lists by %s at the database', async (category) => {
    findMany.mockResolvedValue([{ ...row, category }] as never);
    expect((await listAdminSettings(category))[0]).toMatchObject({ category, createdAt: date.toISOString(), translations: { vi: 'Trang chủ' } });
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
  });

  it('persists category on insert without overwriting it on conflict', async () => {
    const onConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
    const values = jest.fn().mockReturnValue({ onConflictDoUpdate });
    const tx = {
      select: jest.fn(() => ({ from: jest.fn(() => ({ where: jest.fn(() => ({ for: jest.fn().mockResolvedValue([]) })) })) })),
      insert: jest.fn(() => ({ values })),
      delete: jest.fn(() => ({ where: jest.fn().mockResolvedValue(undefined) })),
    };
    jest.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));
    const setting = Setting.create({ key: row.key, category: 'home', type: 'text', translations: { vi: 'Trang chủ' }, canDelete: true });
    await new DrizzleSettingRepository().save(setting);
    expect(values.mock.calls[0][0]).toMatchObject({ category: 'home', key: row.key });
    expect(onConflictDoUpdate.mock.calls[0][0].target).toBe(siteSettings.key);
    expect(onConflictDoUpdate.mock.calls[0][0].set).not.toHaveProperty('category');
  });
});
