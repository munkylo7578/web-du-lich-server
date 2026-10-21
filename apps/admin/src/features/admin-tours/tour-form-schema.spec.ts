import { describe, expect, it } from '@jest/globals';
import { tourFormSchema } from './tour-form-schema';

const payload = {
  serviceDescription: '',
  serviceDescriptions: {
    accommodation: '',
    stopover: '',
    transportation: '',
    tourguide: '',
  },
  translations: { vi: { name: '' }, en: { name: 'Test tour' } },
  destinations: [],
  services: [],
  plans: [],
  existingImages: [],
};

describe('Tour form departure start month', () => {
  it('accepts an omitted month for legacy clients', () => {
    expect(tourFormSchema.parse(payload).departureStartMonth).toBeUndefined();
  });

  it('preserves an explicit clear through the JSON payload', () => {
    const submitted = JSON.parse(JSON.stringify({ ...payload, departureStartMonth: null }));
    expect(tourFormSchema.parse(submitted).departureStartMonth).toBeNull();
  });

  it.each(Array.from({ length: 12 }, (_, index) => index + 1))('accepts month %i', (departureStartMonth) => {
    expect(tourFormSchema.parse({ ...payload, departureStartMonth }).departureStartMonth)
      .toBe(departureStartMonth);
  });

  it.each([0, 13, -1, 1.5, NaN, Infinity, '6', '', true, '2026-06'])('rejects %s', (departureStartMonth) => {
    const result = tourFormSchema.safeParse({ ...payload, departureStartMonth });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(['departureStartMonth']);
  });
});

describe('Tour form service descriptions', () => {
  it('accepts independent accommodation and stopover descriptions', () => {
    const result = tourFormSchema.parse({
      ...payload,
      serviceDescriptions: {
        ...payload.serviceDescriptions,
        accommodation: '<p>Comfortable accommodation</p>',
        stopover: '<p>Convenient stopover location</p>',
      },
    });

    expect(result.serviceDescriptions.accommodation).toBe('<p>Comfortable accommodation</p>');
    expect(result.serviceDescriptions.stopover).toBe('<p>Convenient stopover location</p>');
  });
});
