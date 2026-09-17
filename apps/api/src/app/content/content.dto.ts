import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { DestinationCountry } from '@destination-country';
import { SERVICE_CATEGORIES, type ServiceCategory } from '@service-category';
import { SETTING_CATEGORIES, type SettingCategory } from '@setting-category';

class ContentLocaleMetaDto {
  @ApiProperty({ enum: ['vi', 'en'] }) requested!: 'vi' | 'en';
  @ApiProperty({ enum: ['vi', 'en'] }) effective!: 'vi' | 'en';
  @ApiProperty() fallback!: boolean;
}

class ContentImageDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'https://api.example.com/uploads/image.webp' })
  url!: string;
  @ApiPropertyOptional({ nullable: true, example: 'Mô tả ảnh' }) altText!:
    | string
    | null;
  @ApiProperty({ minimum: 0 }) sortOrder!: number;
}

class TourImageDto extends ContentImageDto {
  @ApiProperty({ enum: ['cover', 'gallery'] }) role!: 'cover' | 'gallery';
}

class ProvinceContentDto {
  @ApiProperty({ example: '79' }) code!: string;
  @ApiProperty({ example: 'Thành phố Hồ Chí Minh' }) name!: string;
}

class WardContentDto {
  @ApiProperty({ example: '26734' }) code!: string;
  @ApiProperty({ example: 'Bến Nghé' }) name!: string;
  @ApiPropertyOptional({ nullable: true, example: 'Phường Bến Nghé' })
  fullName!: string | null;
  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    example: 10.7798,
    description:
      'Y coordinate of ST_PointOnSurface(gis_wards.geom); null when geometry is unavailable.',
  })
  latitude!: number | null;
  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    example: 106.699,
    description:
      'X coordinate of ST_PointOnSurface(gis_wards.geom); null when geometry is unavailable.',
  })
  longitude!: number | null;
  @ApiPropertyOptional({ nullable: true, type: ProvinceContentDto })
  province!: ProvinceContentDto | null;
}

class LinkedTourContentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: TourImageDto, isArray: true }) images!: TourImageDto[];
}

export class ServiceContentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({
    enum: SERVICE_CATEGORIES,
    description: 'Stable category key, independent of locale.',
    example: 'accommodation',
  })
  category!: ServiceCategory;
  @ApiProperty({ example: 'Khách sạn' }) name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ type: ContentLocaleMetaDto }) locale!: ContentLocaleMetaDto;
  @ApiProperty({ type: ContentImageDto, isArray: true })
  images!: ContentImageDto[];
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}

export class DestinationContentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['LA', 'CB', 'VN'], example: 'VN' })
  country!: DestinationCountry;
  @ApiProperty({ example: 'Thành phố Hồ Chí Minh' }) name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ type: ContentLocaleMetaDto }) locale!: ContentLocaleMetaDto;
  @ApiProperty({ type: WardContentDto, isArray: true })
  wards!: WardContentDto[];
  @ApiProperty({ type: LinkedTourContentDto, isArray: true })
  tours!: LinkedTourContentDto[];
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}

class TourPlanContentDto {
  @ApiProperty({ format: 'uuid' }) planId!: string;
  @ApiProperty({ example: 'Ngày 1' }) name!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ minimum: 0 }) sortOrder!: number;
  @ApiProperty({ type: ContentLocaleMetaDto }) locale!: ContentLocaleMetaDto;
  @ApiProperty({ type: ContentImageDto, isArray: true })
  images!: ContentImageDto[];
}

export class TourContentDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiPropertyOptional({ nullable: true, minimum: 1, maximum: 12 })
  departureStartMonth!: number | null;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiPropertyOptional({ nullable: true }) inclusions!: string | null;
  @ApiPropertyOptional({ nullable: true }) exclusions!: string | null;
  @ApiProperty({ type: ContentLocaleMetaDto }) locale!: ContentLocaleMetaDto;
  @ApiProperty({ type: TourPlanContentDto, isArray: true })
  plans!: TourPlanContentDto[];
  @ApiProperty({ type: TourImageDto, isArray: true }) images!: TourImageDto[];
  @ApiProperty({ type: DestinationContentDto, isArray: true })
  destinations!: DestinationContentDto[];
  @ApiProperty({ type: ServiceContentDto, isArray: true })
  services!: ServiceContentDto[];
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}

export class SettingContentDto {
  @ApiProperty() key!: string;
  @ApiProperty({
    enum: SETTING_CATEGORIES,
    description: 'Stable setting category, independent of locale.',
    example: 'general',
  })
  category!: SettingCategory;
  @ApiProperty() value!: string;
  @ApiProperty({ enum: ['text', 'image', 'video'] })
  type!: 'text' | 'image' | 'video';
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
  @ApiProperty({ type: ContentLocaleMetaDto }) locale!: ContentLocaleMetaDto;
}
