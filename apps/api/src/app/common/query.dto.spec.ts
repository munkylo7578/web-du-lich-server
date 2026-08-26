import { localized, pageMeta } from './query.dto';

describe('localized', () => {
  it('uses the requested translation when available', () => {
    expect(localized([{ locale: 'vi' as const }, { locale: 'en' as const }], 'en')?.locale).toEqual({ requested: 'en', effective: 'en', fallback: false });
  });

  it('falls back to Vietnamese and reports it', () => {
    expect(localized([{ locale: 'vi' as const }], 'en')?.locale).toEqual({ requested: 'en', effective: 'vi', fallback: true });
  });

  it('builds pagination metadata', () => {
    expect(pageMeta(2, 20, 41)).toEqual({ page: 2, limit: 20, total: 41, totalPages: 3 });
  });
});
