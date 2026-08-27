import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';

import { ApiResponseInterceptor } from './api-response.interceptor';

describe('ApiResponseInterceptor', () => {
  const interceptor = new ApiResponseInterceptor();
  const context = {} as ExecutionContext;

  async function intercept(payload: unknown) {
    const next = { handle: () => of(payload) } as CallHandler;
    return lastValueFrom(interceptor.intercept(context, next));
  }

  it('adds success without nesting an existing data payload', async () => {
    await expect(intercept({ data: { id: 'tour-id' } })).resolves.toEqual({
      success: true,
      data: { id: 'tour-id' },
    });
  });

  it('preserves metadata at the envelope root', async () => {
    const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };

    await expect(intercept({ data: [{ id: 'tour-id' }], meta })).resolves.toEqual({
      success: true,
      data: [{ id: 'tour-id' }],
      meta,
    });
  });

  it('wraps raw controller values as data', async () => {
    const health = { status: 'ok', timestamp: '2026-01-01T00:00:00.000Z' };

    await expect(intercept(health)).resolves.toEqual({ success: true, data: health });
  });
});
