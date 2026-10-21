import { serviceFormSchema } from './service-form-schema';

const validPayload = {
  category: 'tourguide',
  translations: {
    vi: { name: 'Hướng dẫn viên', description: '' },
    en: { name: 'Tour guide', description: '' },
  },
  existingImages: [],
};

describe('serviceFormSchema category', () => {
  it.each(['accommodation', 'stopover', 'transportation', 'tourguide'])('accepts supported category %s', (category) => {
    expect(serviceFormSchema.safeParse({ ...validPayload, category }).success).toBe(true);
  });

  it('requires one of the supported category keys', () => {
    expect(
      serviceFormSchema.safeParse({ ...validPayload, category: 'food' })
        .success,
    ).toBe(false);
    expect(
      serviceFormSchema.safeParse({ ...validPayload, category: undefined })
        .success,
    ).toBe(false);
  });
});
