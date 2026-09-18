import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function optionalTrimmedString(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function optionalNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  return Number(value);
}

export class ContactRequestDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn An', maxLength: 200 })
  @IsOptional()
  @Transform(({ value }) => optionalTrimmedString(value))
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: '+84 912 345 678', maxLength: 50 })
  @IsOptional()
  @Transform(({ value }) => optionalTrimmedString(value))
  @IsString()
  @MaxLength(50)
  mobile?: string;

  @ApiPropertyOptional({ example: 'visitor@example.com', maxLength: 320 })
  @IsOptional()
  @Transform(({ value }) => optionalTrimmedString(value))
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({
    description: 'Expected number of tourists.',
    example: 4,
    minimum: 0,
    maximum: 100000,
  })
  @IsOptional()
  @Transform(({ value }) => optionalNumber(value))
  @IsInt()
  @Min(0)
  @Max(100000)
  touristArrivals?: number;

  @ApiPropertyOptional({
    example: 'Please send me the itinerary and price.',
    maxLength: 5000,
  })
  @IsOptional()
  @Transform(({ value }) => optionalTrimmedString(value))
  @IsString()
  @MaxLength(5000)
  message?: string;
}

export class ContactResponseDto {
  @ApiProperty({ example: true })
  sent!: boolean;
}
