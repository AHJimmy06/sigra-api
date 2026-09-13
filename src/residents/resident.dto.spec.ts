import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateResidentDto,
  mapResidentResponse,
  normalizeResidentInput,
  UpdateResidentDto,
} from './resident.dto';

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

describe('resident response contract', () => {
  it('accepts an email on a resident PATCH contract', async () => {
    const dto = plainToInstance(UpdateResidentDto, {
      email: ' ANA@EXAMPLE.COM ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('normalizes boundary whitespace and email casing without changing active', () => {
    expect(
      normalizeResidentInput({
        name: '  Ana Garcia  ',
        email: ' ANA@EXAMPLE.COM ',
        phone: ' 099 123 4567 ',
        active: false,
      }),
    ).toEqual({
      name: 'Ana Garcia',
      email: 'ana@example.com',
      phone: '099 123 4567',
      active: false,
    });
  });

  it('allowlists the resident and unit projections without identity secrets', () => {
    expect(
      mapResidentResponse({
        id: 'resident-1',
        name: 'Ana Garcia',
        phone: null,
        active: true,
        archivedAt: null,
        unitId: 'unit-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        passwordHash: 'must-not-leak',
        role: 'ADMIN',
        unit: {
          id: 'unit-1',
          code: 'A-101',
          address: '101 Main Street',
          parkingSpaces: 2,
          active: false,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
          residents: [{ passwordHash: 'must-not-leak' }],
        },
      } as never,
      'ana@example.com',
    ),
    ).toEqual({
      id: 'resident-1',
      name: 'Ana Garcia',
      email: 'ana@example.com',
      phone: null,
      active: true,
      archivedAt: null,
      unitId: 'unit-1',
      unit: {
        id: 'unit-1',
        code: 'A-101',
        address: '101 Main Street',
        parkingSpaces: 2,
        active: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });
});
