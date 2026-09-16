import { revalidatePath } from 'next/cache';
import { Setting } from '@/domains/setting/domain';
import { settingRepository } from '@/features/admin-settings/repository';
import { requireSession } from '@/lib/auth/session';
import { deleteSettingAction, saveSettingAction } from './actions';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/features/admin-settings/repository', () => ({
  settingRepository: { findByKey: jest.fn(), save: jest.fn(), delete: jest.fn() },
}));
jest.mock('@/features/admin-settings/upload', () => ({
  removeUploadedSettingFiles: jest.fn(), saveSettingImage: jest.fn(), saveSettingVideo: jest.fn(),
}));
jest.mock('@/lib/auth/session', () => ({ requireSession: jest.fn() }));

const payload = { key: 'site.title', category: 'home', type: 'text', translations: { vi: 'Trang chủ', en: 'Home' }, canDelete: true };
const findByKey = jest.mocked(settingRepository.findByKey);
const save = jest.mocked(settingRepository.save);

function body(overrides: Record<string, unknown> = {}) {
  const formData = new FormData();
  formData.set('payload', JSON.stringify({ ...payload, ...overrides }));
  return formData;
}

function existing(category: 'home' | 'general' = 'home', canDelete = true) {
  return Setting.create({ key: payload.key, category, type: 'text', translations: payload.translations, canDelete });
}

beforeEach(() => {
  jest.clearAllMocks();
  findByKey.mockResolvedValue(null);
  save.mockResolvedValue(undefined);
  jest.mocked(settingRepository.delete).mockResolvedValue(undefined);
});

describe('settings actions category scope', () => {
  it.each(['home', 'general'])('creates in %s and refreshes only that page', async (category) => {
    const result = await saveSettingAction(body({ category }));
    expect(result.success).toBe(true);
    expect(requireSession).toHaveBeenCalled();
    expect(save.mock.calls[0][0].toSnapshot()).toMatchObject({ category, key: payload.key, translations: payload.translations });
    expect(revalidatePath).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/settings/${category}`);
  });

  it.each([undefined, '', 'invalid'])('rejects invalid create category %s', async (category) => {
    expect((await saveSettingAction(body({ category }))).success).toBe(false);
    expect(findByKey).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects duplicate keys even when the existing key is in another category', async () => {
    findByKey.mockResolvedValue(existing('general'));
    expect((await saveSettingAction(body())).message).toBe('Key này đã tồn tại.');
    expect(save).not.toHaveBeenCalled();
  });

  it('preserves the category when editing and refreshes its page', async () => {
    findByKey.mockResolvedValue(existing());
    expect((await saveSettingAction(body({ originalKey: payload.key, translations: { vi: 'Mới' } }))).success).toBe(true);
    expect(save.mock.calls[0][0].toSnapshot()).toMatchObject({ category: 'home', translations: { vi: 'Mới' } });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/settings/home');
  });

  it('rejects attempts to change category during an update', async () => {
    findByKey.mockResolvedValue(existing());
    expect((await saveSettingAction(body({ originalKey: payload.key, category: 'general' }))).success).toBe(false);
    expect(save).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('still rejects changes to setting type', async () => {
    findByKey.mockResolvedValue(existing());
    expect((await saveSettingAction(body({ originalKey: payload.key, type: 'image', value: '/uploads/image.png' }))).success).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });

  it('deletes within the selected category and refreshes its list', async () => {
    findByKey.mockResolvedValue(existing());
    expect((await deleteSettingAction(payload.key, 'home')).success).toBe(true);
    expect(requireSession).toHaveBeenCalled();
    expect(settingRepository.delete).toHaveBeenCalledWith(payload.key);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/settings/home');
  });

  it.each(['general', 'invalid'])('rejects deletion from mismatched/invalid category %s', async (category) => {
    findByKey.mockResolvedValue(existing());
    expect((await deleteSettingAction(payload.key, category)).success).toBe(false);
    expect(settingRepository.delete).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('reports deletion protection from the repository', async () => {
    findByKey.mockResolvedValue(existing('home', false));
    jest.mocked(settingRepository.delete).mockRejectedValue(new Error('Không thể xóa'));
    expect((await deleteSettingAction(payload.key, 'home')).success).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
