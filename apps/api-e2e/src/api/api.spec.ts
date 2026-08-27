import axios from 'axios';

describe('API response envelope', () => {
  it('normalizes an authentication error', async () => {
    const res = await axios.get('/api/v1/tours?locale=vi', {
      validateStatus: () => true,
    });

    expect(res.status).toBe(401);
    expect(res.data).toEqual({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing API key',
      },
    });
  });
});
