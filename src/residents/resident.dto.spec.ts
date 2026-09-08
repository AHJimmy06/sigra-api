import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateResidentDto, UpdateResidentDto } from './resident.dto';

describe('resident phone contract', () => {
  it.each(['+593 300 123 4567', '+1 (555) 123-4567 ext. 4', '099 123 4567'])(
    'accepts the supported international format: %s',
    async (phone) => {
      const dto = plainToInstance(CreateResidentDto, {
        name: 'Ana Garcia',
        email: 'ana@example.com',
        password: 'temporary-password',
        unitId: '11111111-1111-4111-8111-111111111111',
        phone,
      });
      await expect(validate(dto)).resolves.toHaveLength(0);
    },
  );

  it.each(['123456', 'extension textual', '+593 CALL-HOME'])(
    'rejects an unsupported phone value: %s',
    async (phone) => {
      const errors = await validate(
        plainToInstance(UpdateResidentDto, { phone }),
      );
      expect(errors).toHaveLength(1);
      expect(errors[0]?.property).toBe('phone');
    },
  );
});
