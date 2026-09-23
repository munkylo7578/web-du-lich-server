// Dependency-free: safe for client components, validation, and domain code.
export const SETTING_CATEGORIES = ['general', 'home', 'about-us'] as const;

export type SettingCategory = (typeof SETTING_CATEGORIES)[number];

export const SETTING_CATEGORY_LABELS: Record<SettingCategory, string> = {
  general: 'Chung',
  home: 'Trang chủ',
  'about-us': 'About us',
};

export function isSettingCategory(value: unknown): value is SettingCategory {
  return SETTING_CATEGORIES.some((category) => category === value);
}
