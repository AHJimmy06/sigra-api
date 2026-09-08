import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AccessEventQueryDto, ValidateAccessDto } from './access.dto';

describe('AccessEventQueryDto', () => {
  it('applies pagination defaults and accepts documented filters', async () => {
    const query = plainToInstance(AccessEventQueryDto, {
      from: '2026-09-01',
      to: '2026-09-07',
      decision: 'ALLOWED',
      direction: 'ENTRY',
      search: 'Ana A-101 guard@example.com',
      page: '2',
      pageSize: '25',
    });

    await expect(validate(query)).resolves.toHaveLength(0);
    expect(query).toMatchObject({ page: 2, pageSize: 25 });
  });

  it.each([
    { from: 'not-a-date' },
    { to: '07/09/2026' },
    { decision: 'UNKNOWN' },
    { direction: 'BOTH' },
    { page: '0' },
    { pageSize: '101' },
    { search: 'x'.repeat(101) },
  ])('rejects invalid access history query %p', async (value) => {
    const errors = await validate(plainToInstance(AccessEventQueryDto, value));
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('ValidateAccessDto', () => {
  const base = {
    clientEventId: '22222222-2222-4222-8222-222222222222',
    direction: 'ENTRY',
  };

  it('accepts the versioned access payload contract', async () => {
    const dto = plainToInstance(ValidateAccessDto, {
      ...base,
      qrPayload: JSON.stringify({
        v: 1,
        passId: '11111111-1111-4111-8111-111111111111',
        token: '123456',
      }),
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each(['not-json', '{}', '{"v":1,"passId":"invalid","token":"123456"}'])(
    'rejects a structurally invalid QR payload: %s',
    async (qrPayload) => {
      const errors = await validate(
        plainToInstance(ValidateAccessDto, { ...base, qrPayload }),
      );
      expect(errors.some((error) => error.property === 'qrPayload')).toBe(true);
    },
  );
});
