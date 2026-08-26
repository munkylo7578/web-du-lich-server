import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const LOCALES = ['vi', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export class LocaleQueryDto {
  @ApiProperty({ enum: LOCALES, description: 'Required content locale. Vietnamese is used only as a per-entity fallback.' })
  @IsIn(LOCALES)
  locale!: Locale;
}

export class PageQueryDto extends LocaleQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export type LocaleMeta = { requested: Locale; effective: Locale; fallback: boolean };

export function localized<T extends { locale: Locale }>(rows: T[], requested: Locale): { value: T; locale: LocaleMeta } | null {
  const value = rows.find((row) => row.locale === requested) ?? rows.find((row) => row.locale === 'vi');
  if (!value) return null;
  return { value, locale: { requested, effective: value.locale, fallback: value.locale !== requested } };
}

export function pageMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
