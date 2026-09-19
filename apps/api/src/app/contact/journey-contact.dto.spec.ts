import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { JourneyContactRequestDto } from './journey-contact.dto';

const validationOptions = { whitelist: true, forbidNonWhitelisted: true };

describe('JourneyContactRequestDto', () => {
  it.each([{}, { locale: 'vi' }, { locale: 'en' }])('accepts optional fields: %j', async (input) => {
    expect(await validate(plainToInstance(JourneyContactRequestDto, input), validationOptions)).toEqual([]);
  });

  it('trims strings and converts a numeric ticket count', async () => {
    const dto = plainToInstance(JourneyContactRequestDto, {
      name: ' Nguyễn Văn An ', email: ' visitor@example.com ',
      phoneNumber: ' +84 912 345 678 ', numberOfTickets: ' 4 ',
      message: ' Please contact me. ', locale: 'en',
    });
    expect(await validate(dto, validationOptions)).toEqual([]);
    expect(dto).toMatchObject({
      name: 'Nguyễn Văn An', email: 'visitor@example.com',
      phoneNumber: '+84 912 345 678', numberOfTickets: 4,
      message: 'Please contact me.', locale: 'en',
    });
  });

  it.each(['', '  ', null, undefined])('accepts omitted/blank optional values: %s', async (value) => {
    const dto = plainToInstance(JourneyContactRequestDto, {
      name: value, email: value, phoneNumber: value, numberOfTickets: value, message: value,
    });
    expect(await validate(dto, validationOptions)).toEqual([]);
  });

  it.each([0, 100000, '0', '100000'])('accepts the ticket boundary %s', async (numberOfTickets) => {
    const dto = plainToInstance(JourneyContactRequestDto, { numberOfTickets });
    expect(await validate(dto, validationOptions)).toEqual([]);
    expect(dto.numberOfTickets).toBe(Number(numberOfTickets));
  });

  it.each([
    -1, 1.5, 100001, '-1', '1.5', '100001', 'abc', '1e2', '0x10',
    true, false, [], [4], {}, NaN, Infinity,
  ])('rejects invalid ticket values: %j', async (numberOfTickets) => {
    const errors = await validate(plainToInstance(JourneyContactRequestDto, { numberOfTickets }), validationOptions);
    expect(errors.some((error) => error.property === 'numberOfTickets')).toBe(true);
  });

  it.each([
    ['email', 'invalid'], ['email', 'a'.repeat(321)],
    ['name', 'a'.repeat(201)], ['name', 123],
    ['phoneNumber', 'a'.repeat(51)], ['phoneNumber', 123],
    ['message', 'a'.repeat(5001)], ['message', {}],
    ['locale', 'fr'], ['locale', null], ['locale', ''],
    ['mobile', '123'], ['touristArrivals', 4], ['unknown', 'value'],
  ])('rejects invalid or unknown %s', async (property, value) => {
    const errors = await validate(plainToInstance(JourneyContactRequestDto, { [property as string]: value }), validationOptions);
    expect(errors.some((error) => error.property === property)).toBe(true);
  });
});
