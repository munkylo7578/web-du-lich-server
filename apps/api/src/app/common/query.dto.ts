import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DESTINATION_COUNTRIES, type DestinationCountry } from '@destination-country';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const LOCALES = ['en', 'vi'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export class LocaleQueryDto {
  @ApiPropertyOptional({
    enum: LOCALES,
    default: DEFAULT_LOCALE,
    description:
      'Content locale. Defaults to English when omitted; missing translations fall back to English.',
  })
  @IsIn(LOCALES)
  locale: Locale = DEFAULT_LOCALE;
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

export class TourListQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    description:
      'Case-insensitive partial match against tour or destination names in the requested locale and English fallback.',
    maxLength: 255,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(12)
  departureStartMonth?: number;
}

export class DestinationListQueryDto extends LocaleQueryDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    description: 'Ignored when limit is omitted.',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    description: 'When omitted, all destinations are returned.',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CountryCodeParamsDto {
  @ApiProperty({ enum: DESTINATION_COUNTRIES, example: 'VN', description: 'Country code. Cambodia uses CB, matching the existing database contract.' })
  @IsIn(DESTINATION_COUNTRIES)
  code!: DestinationCountry;
}

export class CountryListQueryDto extends LocaleQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Ignored when limit is omitted.' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, description: 'When omitted, all countries are returned.' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export type LocaleMeta = {
  requested: Locale;
  effective: Locale;
  fallback: boolean;
};

export function localized<T extends { locale: Locale }>(
  rows: T[],
  requested: Locale,
): { value: T; locale: LocaleMeta } | null {
  const value =
    rows.find((row) => row.locale === requested) ??
    rows.find((row) => row.locale === DEFAULT_LOCALE);
  if (!value) return null;
  return {
    value,
    locale: {
      requested,
      effective: value.locale,
      fallback: value.locale !== requested,
    },
  };
}

export function pageMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
