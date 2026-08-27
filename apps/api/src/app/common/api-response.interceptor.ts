import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { map, type Observable } from 'rxjs';

import {
  isApiControllerPayload,
  type ApiControllerPayload,
  type ApiSuccessResponse,
} from './api-response';

@Injectable()
export class ApiResponseInterceptor<T = unknown, TMeta = unknown>
  implements NestInterceptor<ApiControllerPayload<T, TMeta> | T, ApiSuccessResponse<T, TMeta>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<ApiControllerPayload<T, TMeta> | T>,
  ): Observable<ApiSuccessResponse<T, TMeta>> {
    return next.handle().pipe(
      map((payload) => {
        if (isApiControllerPayload(payload)) {
          return {
            success: true,
            data: payload.data as T,
            ...(payload.meta === undefined ? {} : { meta: payload.meta as TMeta }),
          };
        }

        return { success: true, data: payload as T };
      }),
    );
  }
}
