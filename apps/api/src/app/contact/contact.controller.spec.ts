import 'reflect-metadata';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';

import { ApiKeyGuard } from '../common/api-key.guard';
import { ApiResponseInterceptor } from '../common/api-response.interceptor';
import { API_ENV } from '../config/env';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

describe('ContactController HTTP', () => {
  let app: INestApplication;
  const apiKey = 'test-api-key-at-least-24-characters';
  const contact = {
    send: jest.fn().mockResolvedValue({ data: { sent: true } }),
    sendJourney: jest.fn().mockResolvedValue({ data: { sent: true } }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
      controllers: [ContactController],
      providers: [
        { provide: ContactService, useValue: contact },
        { provide: API_ENV, useValue: { apiKeys: [apiKey] } },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: ApiKeyGuard },
        { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => { await app?.close(); });

  it('routes the validated journey request and returns the standard HTTP 200 envelope', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/contact/journey').set('x-api-key', apiKey)
      .send({ name: ' Visitor ', email: 'visitor@example.com', phoneNumber: ' +84912345678 ',
        numberOfTickets: '4', message: 'Please contact me.', locale: 'en' }).expect(200);
    expect(response.body).toEqual({ success: true, data: { sent: true } });
    expect(contact.sendJourney).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Visitor', email: 'visitor@example.com', phoneNumber: '+84912345678',
      numberOfTickets: 4, message: 'Please contact me.', locale: 'en',
    }));
    expect(contact.send).not.toHaveBeenCalled();
    expect(response.headers['x-ratelimit-limit']).toBe('100');
  });

  it('accepts an empty journey submission', async () => {
    await request(app.getHttpServer()).post('/api/v1/contact/journey')
      .set('x-api-key', apiKey).send({}).expect(200);
    expect(contact.sendJourney).toHaveBeenCalledTimes(1);
  });

  it.each(['', 'incorrect-api-key'])('rejects missing/invalid API keys', async (key) => {
    await request(app.getHttpServer()).post('/api/v1/contact/journey')
      .set('x-api-key', key).send({}).expect(401);
    expect(contact.sendJourney).not.toHaveBeenCalled();
  });

  it.each([
    { numberOfTickets: true }, { numberOfTickets: -1 }, { email: 'invalid' },
    { locale: 'fr' }, { mobile: '123' }, { touristArrivals: 4 }, { unknown: 'field' },
  ])('rejects invalid or unknown journey fields: %j', async (body) => {
    await request(app.getHttpServer()).post('/api/v1/contact/journey')
      .set('x-api-key', apiKey).send(body).expect(400);
    expect(contact.sendJourney).not.toHaveBeenCalled();
  });

  it('retains the original contact endpoint and field names', async () => {
    await request(app.getHttpServer()).post('/api/v1/contact')
      .set('x-api-key', apiKey).send({ mobile: '123', touristArrivals: 4 }).expect(200);
    expect(contact.send).toHaveBeenCalledWith(expect.objectContaining({ mobile: '123', touristArrivals: 4 }));
    expect(contact.sendJourney).not.toHaveBeenCalled();
  });

  it('documents only the journey fields and locale as optional in Swagger', () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder()
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key' }, 'x-api-key').build());
    expect(document.paths['/api/v1/contact/journey'].post?.security).toContainEqual({ 'x-api-key': [] });
    expect(document.paths['/api/v1/contact/journey'].post?.responses['200']).toBeDefined();
    const schema = document.components?.schemas?.JourneyContactRequestDto;
    if (!schema || !('properties' in schema)) throw new Error('Missing journey schema');
    expect(Object.keys(schema.properties ?? {}).sort()).toEqual([
      'email', 'locale', 'message', 'name', 'numberOfTickets', 'phoneNumber',
    ]);
    expect(schema.required ?? []).toEqual([]);
  });
});
