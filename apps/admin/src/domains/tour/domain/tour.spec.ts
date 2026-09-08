import { webcrypto } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { Tour } from './tour';

const translations = [{ locale: 'vi' as const, name: 'Tour thử nghiệm' }];

describe('Tour departure start month', () => {
  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  });

  afterAll(() => {
    if (cryptoDescriptor) Object.defineProperty(globalThis, 'crypto', cryptoDescriptor);
    else Reflect.deleteProperty(globalThis, 'crypto');
  });

  it('leaves new and legacy tours unset', () => {
    const snapshot = Tour.create({ translations }).toSnapshot();
    expect(snapshot.departureStartMonth).toBeUndefined();
    delete snapshot.departureStartMonth;
    expect(Tour.rehydrate(snapshot).toSnapshot().departureStartMonth).toBeUndefined();
  });

  it.each(Array.from({ length: 12 }, (_, index) => index + 1))(
    'round-trips month %i through a snapshot',
    (departureStartMonth) => {
      const tour = Tour.create({ translations, departureStartMonth });
      expect(Tour.rehydrate(tour.toSnapshot()).toSnapshot().departureStartMonth)
        .toBe(departureStartMonth);
    },
  );

  it('updates, clears, and touches the tour', () => {
    const snapshot = Tour.create({ translations, departureStartMonth: 1 }).toSnapshot();
    snapshot.updatedAt = new Date(0);
    const tour = Tour.rehydrate(snapshot);
    tour.updateDepartureStartMonth(12);
    expect(tour.toSnapshot().departureStartMonth).toBe(12);
    expect(tour.toSnapshot().updatedAt.getTime()).toBeGreaterThan(0);
    tour.updateDepartureStartMonth();
    expect(Tour.rehydrate(tour.toSnapshot()).toSnapshot().departureStartMonth).toBeUndefined();
  });

  it.each([0, 13, -1, 1.5, NaN, Infinity, '6', null, true])(
    'rejects invalid month %s on create, rehydrate, and update',
    (value) => {
      const departureStartMonth = value as number;
      expect(() => Tour.create({ translations, departureStartMonth })).toThrow(/month/);
      const tour = Tour.create({ translations, departureStartMonth: 6 });
      expect(() => Tour.rehydrate({ ...tour.toSnapshot(), departureStartMonth })).toThrow(/month/);
      expect(() => tour.updateDepartureStartMonth(departureStartMonth)).toThrow(/month/);
      expect(tour.toSnapshot().departureStartMonth).toBe(6);
    },
  );
});
