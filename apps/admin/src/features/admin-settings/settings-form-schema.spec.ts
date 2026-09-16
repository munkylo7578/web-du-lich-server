import { settingFormSchema } from './settings-form-schema';

const payload = { key: 'site.title', category: 'home', type: 'text', translations: { vi: 'Trang chủ' } };

describe('settingFormSchema', () => {
  it.each(['home', 'general'])('accepts %s from the current section', (category) => {
    expect(settingFormSchema.parse({ ...payload, category }).category).toBe(category);
  });

  it.each([undefined, null, '', 'other'])('rejects missing or invalid category %s', (category) => {
    expect(settingFormSchema.safeParse({ ...payload, category }).success).toBe(false);
  });

  it('still rejects key changes and empty Vietnamese text', () => {
    expect(settingFormSchema.safeParse({ ...payload, originalKey: 'different.key' }).success).toBe(false);
    expect(settingFormSchema.safeParse({ ...payload, translations: { vi: '<p></p>' } }).success).toBe(false);
  });

  it('still rejects external video URLs', () => {
    expect(settingFormSchema.safeParse({ ...payload, type: 'video', value: 'https://example.com/video.mp4' }).success).toBe(false);
  });
});
