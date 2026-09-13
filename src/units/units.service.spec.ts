import { ConflictException } from '@nestjs/common';
import { AccessEvent } from '../access/access-event.entity';
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
    const unit = {
      id: 'unit-1', code: 'A-101', address: '101 Main Street', parkingSpaces: 2,
      active: true, archivedAt: null, createdAt: new Date(), updatedAt: new Date(),
      archivedByUserId: 'admin-0',
    } as ResidentialUnit;
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

    const result = await service.create(
      { code: 'A-101', address: '101 Main Street', parkingSpaces: 2 },
      actor,
    );
    expect(result).toMatchObject({ id: unit.id, code: unit.code, archivedAt: null });
    expect(result).not.toHaveProperty('archivedByUserId');
    expect(audit.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ action: 'UNIT_CREATED', resourceId: unit.id }),
    );
  });

  it('canonicalizes code boundaries before preflighting and persisting a unit', async () => {
    const unit = {
      id: 'unit-1', code: 'a-101', active: true, archivedAt: null,
      createdAt: new Date(), updatedAt: new Date(),
    } as ResidentialUnit;
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
    const service = new UnitsService(
      {} as never,
      dataSource as never,
      { record: jest.fn().mockResolvedValue(undefined) } as never,
    );

    await service.create(
      { code: ' A-101 ', address: '101 Main Street', parkingSpaces: 2 },
      actor,
    );

    expect(repository.exists).toHaveBeenCalledWith({
      where: { code: 'a-101' },
    });
    expect(repository.create).toHaveBeenCalledWith({
      code: 'a-101',
      address: '101 Main Street',
      parkingSpaces: 2,
    });
  });

  it('loads an ADMIN detail with only the safe unit fields', async () => {
    const unit = {
      id: 'unit-1',
      code: 'A-101',
      address: '101 Main Street',
      parkingSpaces: 2,
      active: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    } as ResidentialUnit;
    const service = new UnitsService(
      { findOne: jest.fn().mockResolvedValue(unit) } as never,
      {} as never,
      {} as never,
    );

    await expect(service.findOne(unit.id)).resolves.toEqual({
      id: 'unit-1',
      code: 'A-101',
      address: '101 Main Street',
      parkingSpaces: 2,
      active: true,
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
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
    expect(unitRepository.findOne).toHaveBeenCalledWith({
      where: { id: unit.id },
      lock: { mode: 'pessimistic_write' },
    });
  });

  it('locks then deactivates a unit when only inactive residents remain linked', async () => {
    const unit = {
      id: 'unit-1', active: true, code: 'A-101', address: '101 Main Street', parkingSpaces: 1,
      archivedAt: null, createdAt: new Date(), updatedAt: new Date(),
    } as ResidentialUnit;
    const saved = { ...unit, active: false } as ResidentialUnit;
    const unitRepository = {
      findOne: jest.fn().mockResolvedValue(unit),
      merge: jest.fn().mockReturnValue(saved),
      save: jest.fn().mockResolvedValue(saved),
    };
    const residentRepository = { count: jest.fn().mockResolvedValue(0) };
    const manager = {
      getRepository: jest.fn(
        (entity: typeof ResidentialUnit | typeof Resident) =>
          entity === ResidentialUnit ? unitRepository : residentRepository,
      ),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const dataSource = {
      transaction: jest.fn((work: (value: typeof manager) => unknown) =>
        work(manager),
      ),
    };
    const service = new UnitsService(
      {} as never,
      dataSource as never,
      audit as never,
    );

    await expect(
      service.update(unit.id, { active: false }, actor),
    ).resolves.toMatchObject({ id: saved.id, active: false, archivedAt: null });

    expect(residentRepository.count).toHaveBeenCalledWith({
      where: { unitId: unit.id, active: true },
    });
    expect(unitRepository.save).toHaveBeenCalledWith(saved);
    expect(audit.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ action: 'UNIT_DEACTIVATED' }),
    );
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

  it('archives a dependency-free inactive unit without changing active and records one transition audit', async () => {
    const unit = {
      id: 'unit-1',
      active: false,
      archivedAt: null,
      archivedByUserId: null,
      code: 'a-101',
      address: '101 Main Street',
      parkingSpaces: 2,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    } as ResidentialUnit;
    const units = { findOne: jest.fn().mockResolvedValue(unit), save: jest.fn().mockResolvedValue(unit) };
    const residents = { count: jest.fn().mockResolvedValue(0) };
    const events = { count: jest.fn().mockResolvedValue(0) };
    const manager = {
      getRepository: jest.fn((entity) => entity === ResidentialUnit ? units : entity === Resident ? residents : events),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new UnitsService({} as never, { transaction: (work) => work(manager) } as never, audit as never);

    const result = await service.archive(unit.id, actor);

    expect(result).toMatchObject({ id: unit.id, active: false, archivedAt: expect.any(String) });
    expect(residents.count).toHaveBeenCalledWith({ where: { unitId: unit.id } });
    expect(events.count).toHaveBeenCalledWith({ where: { unitId: unit.id } });
    expect(audit.record).toHaveBeenCalledWith(manager, expect.objectContaining({ action: 'UNIT_ARCHIVED' }));
  });

  it('rejects archive for inactive historical residents but leaves deactivation semantics unchanged', async () => {
    const unit = { id: 'unit-1', active: true, archivedAt: null } as ResidentialUnit;
    const units = { findOne: jest.fn().mockResolvedValue(unit), save: jest.fn() };
    const residents = { count: jest.fn().mockResolvedValue(1) };
    const manager = { getRepository: jest.fn((entity) => entity === ResidentialUnit ? units : residents) };
    const audit = { record: jest.fn() };
    const service = new UnitsService({} as never, { transaction: (work) => work(manager) } as never, audit as never);

    await expect(service.archive(unit.id, actor)).rejects.toBeInstanceOf(ConflictException);
    expect(units.save).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('rejects archive for retained access history without writing an audit', async () => {
    const unit = { id: 'unit-1', active: true, archivedAt: null } as ResidentialUnit;
    const units = { findOne: jest.fn().mockResolvedValue(unit), save: jest.fn() };
    const residents = { count: jest.fn().mockResolvedValue(0) };
    const events = { count: jest.fn().mockResolvedValue(1) };
    const manager = {
      getRepository: jest.fn((entity) => entity === ResidentialUnit ? units : entity === Resident ? residents : events),
    };
    const audit = { record: jest.fn() };
    const service = new UnitsService({} as never, { transaction: (work) => work(manager) } as never, audit as never);

    await expect(service.archive(unit.id, actor)).rejects.toBeInstanceOf(ConflictException);
    expect(events.count).toHaveBeenCalledWith({ where: { unitId: unit.id } });
    expect(units.save).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('hides archives by default and includes them only for the explicit archive query', async () => {
    const query = {
      andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const service = new UnitsService({ createQueryBuilder: jest.fn().mockReturnValue(query) } as never, {} as never, {} as never);

    await service.list({ page: 1, pageSize: 10 });
    await service.list({ page: 1, pageSize: 10, includeArchived: 'true' });

    expect(query.andWhere).toHaveBeenCalledWith('unit.archivedAt IS NULL');
    expect(query.getManyAndCount).toHaveBeenCalledTimes(2);
  });

  it('restores an archived unit once and makes repeated target-state commands no-ops', async () => {
    const unit = {
      id: 'unit-1', active: false, archivedAt: new Date('2026-01-03T00:00:00.000Z'), archivedByUserId: 'admin-0',
      code: 'a-101', address: '101 Main Street', parkingSpaces: 2,
      createdAt: new Date('2026-01-01T00:00:00.000Z'), updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    } as ResidentialUnit;
    const units = { findOne: jest.fn().mockResolvedValue(unit), save: jest.fn().mockResolvedValue(unit) };
    const manager = { getRepository: jest.fn().mockReturnValue(units) };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new UnitsService({} as never, { transaction: (work) => work(manager) } as never, audit as never);

    await expect(service.restore(unit.id, actor)).resolves.toMatchObject({ active: false, archivedAt: null });
    await expect(service.restore(unit.id, actor)).resolves.toMatchObject({ active: false, archivedAt: null });

    expect(units.save).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(manager, expect.objectContaining({ action: 'UNIT_RESTORED' }));
  });
});
