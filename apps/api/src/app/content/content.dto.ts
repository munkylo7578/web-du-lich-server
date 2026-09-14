import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SERVICE_CATEGORIES, type ServiceCategory } from '@service-category';

class ContentLocaleMetaDto {
  @ApiProperty({ enum: ['vi', 'en'] })
  requested!: 'vi' | 'en';

  @ApiProperty({ enum: ['vi', 'en'] })
  effective!: 'vi' | 'en';

  @ApiProperty()
  fallback!: boolean;
}

class ContentImageDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'https://api.example.com/uploads/services/hotel.webp' })
  url!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Phòng khách sạn' })
  altText!: string | null;

  @ApiProperty({ minimum: 0 })
  sortOrder!: number;
}

export class ServiceContentDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    enum: SERVICE_CATEGORIES,
    description: 'Stable service category key, independent of requested locale.',
    example: 'accommodation',
  })
  category!: ServiceCategory;

  @ApiProperty({ example: 'Khách sạn' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Dịch vụ lưu trú trong hành trình.' })
  description!: string | null;

  @ApiProperty({ type: ContentLocaleMetaDto })
  locale!: ContentLocaleMetaDto;

  @ApiProperty({ type: ContentImageDto, isArray: true })
  images!: ContentImageDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
