import { serviceFormSchema } from './service-form-schema';

const validPayload = {
  category: 'tourguide',
  translations: {
    vi: { name: 'Hướng dẫn viên', description: '' },
    en: { name: '', description: '' },
  },
  existingImages: [],
};

describe('serviceFormSchema category', () => {
  it('accepts a supported category', () => {
    expect(serviceFormSchema.safeParse(validPayload).success).toBe(true);
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
