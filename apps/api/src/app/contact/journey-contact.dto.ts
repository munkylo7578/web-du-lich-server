import { ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { ContactRequestDto } from './contact.dto';

export class JourneyContactRequestDto extends PickType(ContactRequestDto, [
  'locale',
  'name',
  'email',
  'message',
] as const) {
  @ApiPropertyOptional({ example: '+84 912 345 678', maxLength: 50 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString()
  @MaxLength(50)
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Number of tickets. Accepts an integer or a decimal integer string.',
    example: 4,
    minimum: 0,
    maximum: 100000,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return /^\d+$/.test(trimmed) ? Number(trimmed) : value;
  })
  @IsInt()
  @Min(0)
  @Max(100000)
  numberOfTickets?: number;
}
