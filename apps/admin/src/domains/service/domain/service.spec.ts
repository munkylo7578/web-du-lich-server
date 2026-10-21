import { Service } from './service';

const translations = [{ locale: 'en' as const, name: 'Hotel' }];

describe('Service category', () => {
  it('creates and snapshots a supported category', () => {
    expect(
      Service.create('accommodation', translations).toSnapshot().category,
    ).toBe('accommodation');
  });

  it('replaces the category', () => {
    const service = Service.create('accommodation', translations);
    service.replaceCategory('stopover');
    expect(service.toSnapshot().category).toBe('stopover');
  });

  it('rejects an unsupported category at the domain boundary', () => {
    expect(() => Service.create('food' as never, translations)).toThrow(
      'Service category',
    );
  });
});
