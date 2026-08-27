import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

class ApiErrorBodyDto {
  @ApiProperty({ example: 'BAD_REQUEST' })
  code!: string;

  @ApiProperty({ example: 'Validation failed' })
  message!: string;

  @ApiPropertyOptional({
    description: 'Optional structured error context, such as validation messages.',
    type: Object,
  })
  details?: unknown;
}

export class ApiErrorResponseDto {
  @ApiProperty({ enum: [false], example: false })
  success!: false;

  @ApiProperty({ type: ApiErrorBodyDto })
  error!: ApiErrorBodyDto;
}

type ApiSuccessResponseOptions = {
  description?: string;
  hasMeta?: boolean;
  isArray?: boolean;
};

export function ApiSuccessEnvelope(options: ApiSuccessResponseOptions = {}): MethodDecorator {
  const dataSchema = options.isArray
    ? { type: 'array' as const, items: { type: 'object' as const } }
    : { type: 'object' as const };
  const required = options.hasMeta ? ['success', 'data', 'meta'] : ['success', 'data'];

  return ApiOkResponse({
    description: options.description,
    schema: {
      type: 'object',
      required,
      properties: {
        success: { type: 'boolean', enum: [true], example: true },
        data: dataSchema,
        ...(options.hasMeta ? { meta: { type: 'object' } } : {}),
      },
    },
  });
}

export function ApiCommonErrorResponses(): ClassDecorator & MethodDecorator {
  return applyDecorators(
    ApiBadRequestResponse({ description: 'Invalid request', type: ApiErrorResponseDto }),
    ApiUnauthorizedResponse({ description: 'Invalid or missing API key', type: ApiErrorResponseDto }),
    ApiNotFoundResponse({ description: 'Resource not found', type: ApiErrorResponseDto }),
    ApiResponse({ status: 429, description: 'Rate limit exceeded', type: ApiErrorResponseDto }),
    ApiInternalServerErrorResponse({ description: 'Unexpected server error', type: ApiErrorResponseDto }),
  );
}
