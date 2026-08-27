import {
  BadRequestException,
  type ArgumentsHost,
  HttpStatus,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';

import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  const response = {};
  const reply = jest.fn();
  const adapterHost = { httpAdapter: { reply } } as unknown as HttpAdapterHost;
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as ArgumentsHost;
  const filter = new ApiExceptionFilter(adapterHost);

  beforeEach(() => reply.mockClear());

  it('normalizes validation errors and exposes messages as details', () => {
    filter.catch(new BadRequestException(['locale must be one of vi, en']), host);

    expect(reply).toHaveBeenCalledWith(response, {
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Validation failed',
        details: ['locale must be one of vi, en'],
      },
    }, HttpStatus.BAD_REQUEST);
  });

  it.each([
    [new UnauthorizedException('Invalid or missing API key'), HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED'],
    [new NotFoundException('Tour not found'), HttpStatus.NOT_FOUND, 'NOT_FOUND'],
  ])('normalizes expected HTTP exceptions', (exception, status, code) => {
    filter.catch(exception, host);

    expect(reply).toHaveBeenCalledWith(response, {
      success: false,
      error: { code, message: exception.message },
    }, status);
  });

  it('hides unexpected exception details', () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    filter.catch(new Error('database credentials leaked'), host);

    expect(reply).toHaveBeenCalledWith(response, {
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
    }, HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
