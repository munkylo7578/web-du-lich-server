import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import type { ApiErrorBody, ApiErrorResponse } from './api-response';

type NestErrorResponse = {
  code?: unknown;
  details?: unknown;
  error?: unknown;
  message?: unknown;
};

@Catch()
@Injectable()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const context = host.switchToHttp();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logUnexpectedException(exception);
    }

    const body: ApiErrorResponse = {
      success: false,
      error: this.toErrorBody(exception, status),
    };

    httpAdapter.reply(context.getResponse(), body, status);
  }

  private toErrorBody(exception: unknown, status: number): ApiErrorBody {
    if (!(exception instanceof HttpException) || status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      };
    }

    const response = exception.getResponse();
    const statusCode = HttpStatus[status];
    const defaultCode = typeof statusCode === 'string' ? statusCode : 'HTTP_ERROR';

    if (typeof response === 'string') {
      return { code: defaultCode, message: response };
    }

    const error = response as NestErrorResponse;
    const messages = Array.isArray(error.message)
      ? error.message.filter((message): message is string => typeof message === 'string')
      : undefined;
    const message = messages
      ? 'Validation failed'
      : typeof error.message === 'string'
        ? error.message
        : exception.message;
    const details = error.details ?? (messages && messages.length > 0 ? messages : undefined);

    return {
      code: typeof error.code === 'string' ? error.code : defaultCode,
      message,
      ...(details === undefined ? {} : { details }),
    };
  }

  private logUnexpectedException(exception: unknown): void {
    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      return;
    }

    this.logger.error('An unknown exception was thrown', exception);
  }
}
