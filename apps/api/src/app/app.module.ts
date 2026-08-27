import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { ApiExceptionFilter } from './common/api-exception.filter';
import { ApiKeyGuard } from './common/api-key.guard';
import { ApiResponseInterceptor } from './common/api-response.interceptor';
import { ContentController } from './content/content.controller';
import { ContentService } from './content/content.service';
import { API_ENV, loadEnvironment } from './config/env';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';

const env = loadEnvironment();

@Module({
  imports: [
    DatabaseModule,
    ThrottlerModule.forRoot([{ ttl: env.rateLimitTtlMs, limit: env.rateLimitLimit }]),
  ],
  controllers: [HealthController, ContentController],
  providers: [
    ContentService,
    { provide: API_ENV, useValue: env },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
