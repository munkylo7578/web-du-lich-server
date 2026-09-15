import {
  DESTINATION_COUNTRIES,
  DESTINATION_COUNTRY_LABELS,
  destinationWardCodes,
  isDestinationCountry,
} from '@destination-country';

describe('destination country contract', () => {
  it('exposes CB as the Cambodia key and label', () => {
    expect(DESTINATION_COUNTRIES).toEqual(['LA', 'CB', 'VN']);
    expect(DESTINATION_COUNTRY_LABELS.CB).toBe('Cambodia');
  });

  it('accepts CB and rejects the legacy KH key', () => {
    expect(isDestinationCountry('CB')).toBe(true);
    expect(isDestinationCountry('KH')).toBe(false);
  });

  it('does not preserve ward codes for Cambodia', () => {
    expect(destinationWardCodes('CB', ['00001'])).toEqual([]);
  });
});
