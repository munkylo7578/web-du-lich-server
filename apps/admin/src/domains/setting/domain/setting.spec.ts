import { Setting, type CreateSettingProps } from './setting';
import { isSettingCategory, SETTING_CATEGORIES } from '@setting-category';

const props: CreateSettingProps = {
  key: 'site.title', category: 'home', type: 'text',
  translations: { vi: 'Trang chủ', en: 'Home' }, canDelete: false,
};

describe('Setting category', () => {
  it('creates, rehydrates and updates plain text without HTML processing', () => {
    const setting = Setting.create({ ...props, type: 'plain_text', translations: { vi: ' Sales@kindtraveldmc.com ', en: ' ' } });
    expect(setting.toSnapshot()).toMatchObject({ type: 'plain_text', value: undefined, translations: { vi: 'Sales@kindtraveldmc.com' } });
    expect(setting.toSnapshot().translations.en).toBeUndefined();
    const restored = Setting.rehydrate(setting.toSnapshot());
    restored.update({ translations: { vi: ' <literal> & text ', en: ' English ' } });
    expect(restored.toSnapshot().translations).toEqual({ vi: '<literal> & text', en: 'English' });
  });

  it('rejects blank plain text and preserves existing rich text', () => {
    expect(() => Setting.create({ ...props, type: 'plain_text', translations: { vi: ' ' } })).toThrow('bắt buộc');
    expect(Setting.create({ ...props, translations: { vi: '<p>Rich text</p>' } }).toSnapshot().translations.vi).toBe('<p>Rich text</p>');
  });

  it.each(SETTING_CATEGORIES)('creates and rehydrates %s', (category) => {
    const setting = Setting.create({ ...props, category });
    expect(setting.toSnapshot().category).toBe(category);
    expect(Setting.rehydrate(setting.toSnapshot()).toSnapshot()).toEqual(setting.toSnapshot());
  });

  it.each([undefined, null, '', 'other', 'HOME'])('rejects category %s', (category) => {
    expect(isSettingCategory(category)).toBe(false);
    expect(() => Setting.create({ ...props, category: category as never })).toThrow('Nhóm setting');
    expect(() => Setting.rehydrate({ ...Setting.create(props).toSnapshot(), category: category as never })).toThrow('Nhóm setting');
  });

  it('preserves category, key, type and deletion protection on update', () => {
    const setting = Setting.create(props);
    setting.update({ translations: { vi: 'Nội dung mới' } });
    expect(setting.toSnapshot()).toMatchObject({ category: 'home', key: props.key, type: 'text', canDelete: false });
    expect(() => setting.assertCanDelete()).toThrow('không thể xóa');
  });

  it.each(['image', 'video'] as const)('preserves %s content', (type) => {
    const value = type === 'image' ? '/uploads/logo.png' : '/uploads/settings/videos/banner.mp4';
    const setting = Setting.create({ ...props, type, value, category: 'general' });
    expect(setting.toSnapshot()).toMatchObject({ category: 'general', type, value });
  });
});
