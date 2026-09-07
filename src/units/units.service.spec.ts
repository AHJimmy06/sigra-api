import { ConflictException } from '@nestjs/common';
import { Role } from '../common/role.enum';
import { Resident } from '../residents/resident.entity';
import { ResidentialUnit } from './unit.entity';
import { UnitsService } from './units.service';

const actor = {
  sub: 'admin-1',
  email: 'admin@example.com',
  role: Role.ADMIN,
  residentId: null,
};

describe('UnitsService', () => {
  it('creates a unique unit and audit record in one transaction', async () => {
    const unit = { id: 'unit-1', code: 'A-101' } as ResidentialUnit;
    const repository = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockReturnValue(unit),
      save: jest.fn().mockResolvedValue(unit),
    };
    const manager = { getRepository: jest.fn().mockReturnValue(repository) };
    const dataSource = {
      transaction: jest.fn((work: (value: typeof manager) => unknown) =>
        work(manager),
      ),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new UnitsService({} as never, dataSource as never, audit);

    await expect(
      service.create(
        { code: 'A-101', address: '101 Main Street', parkingSpaces: 2 },
        actor,
      ),
    ).resolves.toBe(unit);
    expect(audit.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ action: 'UNIT_CREATED', resourceId: unit.id }),
    );
  });

  it('rejects deactivation while active residents remain linked', async () => {
    const unit = { id: 'unit-1', active: true } as ResidentialUnit;
    const unitRepository = { findOne: jest.fn().mockResolvedValue(unit) };
    const residentRepository = { count: jest.fn().mockResolvedValue(1) };
    const manager = {
      getRepository: jest.fn(
        (entity: typeof ResidentialUnit | typeof Resident) =>
          entity === ResidentialUnit ? unitRepository : residentRepository,
      ),
    };
    const dataSource = {
      transaction: jest.fn((work: (value: typeof manager) => unknown) =>
        work(manager),
      ),
    };
    const service = new UnitsService(
      {} as never,
      dataSource as never,
      {} as never,
    );

    await expect(
      service.update(unit.id, { active: false }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('translates a concurrent update code collision to conflict', async () => {
    const unit = {
      id: 'unit-1',
      code: 'A-101',
      active: true,
    } as ResidentialUnit;
    const repository = {
      findOne: jest.fn().mockResolvedValue(unit),
      merge: jest.fn().mockReturnValue({ ...unit, code: 'A-102' }),
      save: jest.fn().mockRejectedValue({ driverError: { code: '23505' } }),
    };
    const manager = { getRepository: jest.fn().mockReturnValue(repository) };
    const dataSource = {
      transaction: jest.fn((work: (value: typeof manager) => unknown) =>
        work(manager),
      ),
    };
    const service = new UnitsService(
      {} as never,
      dataSource as never,
      {} as never,
    );

    await expect(
      service.update(unit.id, { code: 'A-102' }, actor),
    ).rejects.toMatchObject({ status: 409 });
  });
});
