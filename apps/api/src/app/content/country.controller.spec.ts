import 'reflect-metadata';
import { type INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { ApiKeyGuard } from '../common/api-key.guard';
import { ApiExceptionFilter } from '../common/api-exception.filter';
import { ApiResponseInterceptor } from '../common/api-response.interceptor';
import { API_ENV } from '../config/env';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

describe('Country content HTTP API', () => {
  let app: INestApplication;
  const apiKey = 'country-test-api-key-at-least-32-characters';
  const content = { countries: jest.fn(), country: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        { provide: ContentService, useValue: content },
        { provide: API_ENV, useValue: { apiKeys: [apiKey] } },
        { provide: APP_GUARD, useClass: ApiKeyGuard },
        { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  beforeEach(() => {
    jest.resetAllMocks();
    content.countries.mockResolvedValue({ data: [{ code: 'VN' }], meta: { page: 1, limit: 1, total: 1, totalPages: 1 } });
    content.country.mockResolvedValue({ data: { code: 'VN' } });
  });
  afterAll(async () => { await app?.close(); });

  it('defaults to English and returns the standard list envelope', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/countries').set('x-api-key', apiKey).expect(200);
    expect(response.body).toEqual({ success: true, data: [{ code: 'VN' }], meta: { page: 1, limit: 1, total: 1, totalPages: 1 } });
    expect(content.countries).toHaveBeenCalledWith('en', 1, undefined);
  });

  it('transforms pagination and accepts Vietnamese', async () => {
    await request(app.getHttpServer()).get('/api/v1/countries?locale=vi&page=2&limit=1').set('x-api-key', apiKey).expect(200);
    expect(content.countries).toHaveBeenCalledWith('vi', 2, 1);
  });

  it.each(['LA', 'CB', 'VN'])('accepts supported country code %s', async (code) => {
    await request(app.getHttpServer()).get(`/api/v1/countries/${code}`).set('x-api-key', apiKey).expect(200);
    expect(content.country).toHaveBeenCalledWith(code, 'en');
  });

  it.each(['KH', 'US', 'vn', '123', '11111111-1111-4111-8111-111111111111'])('rejects unsupported code %s', async (code) => {
    const response = await request(app.getHttpServer()).get(`/api/v1/countries/${code}`).set('x-api-key', apiKey).expect(400);
    expect(response.body).toMatchObject({ success: false, error: { code: 'BAD_REQUEST' } });
    expect(content.country).not.toHaveBeenCalled();
  });

  it.each(['locale=fr', 'page=0', 'page=1.5', 'limit=0', 'limit=101', 'limit=abc', 'unknown=true'])('rejects invalid list query %s', async (query) => {
    await request(app.getHttpServer()).get(`/api/v1/countries?${query}`).set('x-api-key', apiKey).expect(400);
    expect(content.countries).not.toHaveBeenCalled();
  });

  it('validates detail locale and returns a detail envelope', async () => {
    await request(app.getHttpServer()).get('/api/v1/countries/VN?locale=fr').set('x-api-key', apiKey).expect(400);
    expect(content.country).not.toHaveBeenCalled();
    const response = await request(app.getHttpServer()).get('/api/v1/countries/VN?locale=vi').set('x-api-key', apiKey).expect(200);
    expect(content.country).toHaveBeenCalledWith('VN', 'vi');
    expect(response.body).toEqual({ success: true, data: { code: 'VN' } });
  });

  it.each(['/api/v1/countries', '/api/v1/countries/VN'])('protects %s against missing and invalid API keys', async (path) => {
    await request(app.getHttpServer()).get(path).expect(401);
    await request(app.getHttpServer()).get(path).set('x-api-key', 'incorrect').expect(401);
    expect(content.countries).not.toHaveBeenCalled();
    expect(content.country).not.toHaveBeenCalled();
  });

  it('returns the standard 404 envelope for an absent seeded country', async () => {
    content.country.mockRejectedValue(new NotFoundException('Country or translation not found'));
    const response = await request(app.getHttpServer()).get('/api/v1/countries/VN').set('x-api-key', apiKey).expect(404);
    expect(response.body).toEqual({ success: false, error: { code: 'NOT_FOUND', message: 'Country or translation not found' } });
  });

  it('documents country routes, supported codes, nullable content, images and API-key security', () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder()
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key' }, 'x-api-key').build());
    const detail = document.paths['/api/v1/countries/{code}'].get;
    expect(detail?.security).toContainEqual({ 'x-api-key': [] });
    expect(detail?.parameters).toContainEqual(expect.objectContaining({ name: 'code', in: 'path', required: true,
      schema: expect.objectContaining({ enum: ['LA', 'CB', 'VN'] }) }));
    expect(document.paths['/api/v1/countries'].get?.responses['200']).toBeDefined();
    expect(document.paths['/api/v1/countries'].post).toBeUndefined();
    const schema = document.components?.schemas?.CountryContentDto;
    if (!schema || !('properties' in schema)) throw new Error('Missing country schema');
    expect(Object.keys(schema.properties ?? {}).sort()).toEqual(['code', 'createdAt', 'description', 'images', 'locale', 'name', 'updatedAt', 'visa', 'weather']);
    expect(schema.properties?.visa).toMatchObject({ type: 'string', nullable: true });
    expect(schema.properties?.images).toMatchObject({ type: 'array' });
  });
});
