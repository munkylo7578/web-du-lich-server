import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app/app.module';
import { loadEnvironment } from './app/config/env';

async function bootstrap() {
  const env = loadEnvironment();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: true });
  app.use(helmet());
  app.getHttpAdapter().getInstance().set('trust proxy', env.trustProxy ? 1 : false);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  if (env.corsOrigins.length > 0) {
    app.enableCors({ origin: env.corsOrigins, methods: ['GET'], allowedHeaders: ['x-api-key', 'content-type'] });
  }
  const globalPrefix = 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  if (env.docsEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Travel Content API')
      .setDescription('Read-only localized REST API. Every content route requires locale=vi|en and x-api-key.')
      .setVersion('1.0')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key' }, 'x-api-key')
      .build();
    SwaggerModule.setup(`${globalPrefix}/docs`, app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(env.port, '0.0.0.0');
  Logger.log(`Application is running on http://localhost:${env.port}/${globalPrefix}`);
}

void bootstrap();
