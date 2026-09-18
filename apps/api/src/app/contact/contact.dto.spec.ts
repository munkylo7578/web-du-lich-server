import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ContactRequestDto } from './contact.dto';

describe('ContactRequestDto', () => {
  it('allows an empty submission because every field is optional', async () => {
    const request = plainToInstance(ContactRequestDto, {});
    expect(await validate(request)).toEqual([]);
  });

  it('trims strings and transforms tourist arrivals to an integer', async () => {
    const request = plainToInstance(ContactRequestDto, {
      name: '  Nguyễn Văn An  ',
      mobile: '  +84 912 345 678 ',
      email: ' visitor@example.com ',
      touristArrivals: '4',
      message: '  Please contact me.  ',
    });

    expect(await validate(request)).toEqual([]);
    expect(request).toEqual({
      name: 'Nguyễn Văn An',
      mobile: '+84 912 345 678',
      email: 'visitor@example.com',
      touristArrivals: 4,
      message: 'Please contact me.',
    });
  });

  it.each([
    [{ email: 'invalid' }, 'email'],
    [{ touristArrivals: -1 }, 'touristArrivals'],
    [{ touristArrivals: 1.5 }, 'touristArrivals'],
    [{ message: 'a'.repeat(5001) }, 'message'],
  ])('rejects an invalid supplied value: %s', async (input, property) => {
    const request = plainToInstance(ContactRequestDto, input);
    const errors = await validate(request);
    expect(errors.some((error) => error.property === property)).toBe(true);
  });
});
