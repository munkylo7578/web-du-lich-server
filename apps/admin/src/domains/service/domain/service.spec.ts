import { Service } from './service';

const translations = [{ locale: 'vi' as const, name: 'Khách sạn' }];

describe('Service category', () => {
  it('creates and snapshots a supported category', () => {
    expect(
      Service.create('accommodation', translations).toSnapshot().category,
    ).toBe('accommodation');
  });

  it('replaces the category', () => {
    const service = Service.create('accommodation', translations);
    service.replaceCategory('transportation');
    expect(service.toSnapshot().category).toBe('transportation');
  });

  it('rejects an unsupported category at the domain boundary', () => {
    expect(() => Service.create('food' as never, translations)).toThrow(
      'Service category',
    );
  });
});
