import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  DestinationListQueryDto,
  localized,
  pageMeta,
  TourListQueryDto,
} from './query.dto';

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

describe('TourListQueryDto', () => {
  it('trims search and transforms a valid departure month', async () => {
    const query = plainToInstance(TourListQueryDto, {
      locale: 'en',
      search: '  Hội An  ',
      departureStartMonth: '6',
    });

    expect(await validate(query)).toEqual([]);
    expect(query.search).toBe('Hội An');
    expect(query.departureStartMonth).toBe(6);
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
  });

  it('treats whitespace-only search as omitted', async () => {
    const query = plainToInstance(TourListQueryDto, {
      locale: 'vi',
      search: '   ',
    });

    expect(await validate(query)).toEqual([]);
    expect(query.search).toBeUndefined();
  });

  it.each(['0', '13', '1.5'])('rejects invalid departure month %s', async (month) => {
    const query = plainToInstance(TourListQueryDto, {
      locale: 'vi',
      departureStartMonth: month,
    });

    expect(await validate(query)).not.toEqual([]);
  });
});

describe('DestinationListQueryDto', () => {
  it('leaves limit undefined when omitted', async () => {
    const query = plainToInstance(DestinationListQueryDto, {
      locale: 'vi',
      page: '3',
    });

    expect(await validate(query)).toEqual([]);
    expect(query.page).toBe(3);
    expect(query.limit).toBeUndefined();
  });

  it('transforms and validates an explicitly supplied limit', async () => {
    const query = plainToInstance(DestinationListQueryDto, {
      locale: 'en',
      page: '2',
      limit: '25',
    });

    expect(await validate(query)).toEqual([]);
    expect(query).toMatchObject({ page: 2, limit: 25 });
  });
});
