import { DESTINATION_COUNTRIES, destinationProvinceCodes } from '@destination-country';

describe('destination province codes', () => {
  it.each(DESTINATION_COUNTRIES)('preserves and deduplicates selections for %s', (country) => {
    const codes = ['01', '02', '01'];

    expect(destinationProvinceCodes(country, codes)).toEqual(['01', '02']);
    expect(codes).toEqual(['01', '02', '01']);
  });

  it.each(DESTINATION_COUNTRIES)('allows no selections for %s', (country) => {
    expect(destinationProvinceCodes(country, [])).toEqual([]);
  });
});
