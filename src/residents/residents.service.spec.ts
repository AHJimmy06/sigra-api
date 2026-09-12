import { User } from '../users/user.entity';
import { Resident } from './resident.entity';
import { ResidentsService } from './residents.service';
import { Role } from '../common/role.enum';
import { compare } from 'bcryptjs';
import { ResidentialUnit } from '../units/unit.entity';

const actor = {
  sub: 'admin-1',
  email: 'admin@example.com',
  role: Role.ADMIN,
  residentId: null,
};

describe('ResidentsService', () => {
  it('loads each resident unit in the paginated administrative response', async () => {
    const query = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn().mockResolvedValue({
        entities: [
          {
            id: 'resident-1',
            name: 'Ana Garcia',
            phone: null,
            active: true,
            unitId: 'unit-1',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
            unit: {
              id: 'unit-1',
              code: 'A-101',
              address: '101 Main Street',
              parkingSpaces: 2,
              active: true,
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              updatedAt: new Date('2026-01-02T00:00:00.000Z'),
            },
          },
        ],
        raw: [{ user_email: 'resident@example.com' }],
      }),
    };
    const service = new ResidentsService(
      { createQueryBuilder: jest.fn().mockReturnValue(query) } as never,
      {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue({ email: 'ana@example.com' }),
        }),
      } as never,
      {} as never,
    );

    const result = await service.list({ page: 1, pageSize: 10 });
    expect(result).toMatchObject({ total: 1, page: 1, pageSize: 10 });
    expect(result.items[0].email).toBe('resident@example.com');
    expect(result.items[0].unit.code).toBe('A-101');
    expect(query.leftJoinAndSelect).toHaveBeenCalledWith(
      'resident.unit',
      'unit',
    );
  });

  it('loads an ADMIN detail with only the safe resident and unit fields', async () => {
    const resident = {
      id: 'resident-1',
      name: 'Ana Garcia',
      phone: null,
      active: true,
      archivedAt: null,
      unitId: 'unit-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      unit: {
        id: 'unit-1',
        code: 'A-101',
        address: '101 Main Street',
        parkingSpaces: 2,
        active: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    } as Resident;
    const service = new ResidentsService(
      { findOne: jest.fn().mockResolvedValue(resident) } as never,
      {} as never,
      {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue({ email: 'ana@example.com' }),
        }),
      } as never,
      {} as never,
      {} as never,
    );

    await expect(service.findOne(resident.id)).resolves.toEqual({
      id: 'resident-1',
      name: 'Ana Garcia',
      email: 'ana@example.com',
      phone: null,
      active: true,
      archivedAt: null,
      unitId: 'unit-1',
      unit: expect.objectContaining({ id: 'unit-1', code: 'A-101' }),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  it('creates a resident account transactionally without exposing the password hash', async () => {
    const unit = { id: 'unit-1', active: true } as ResidentialUnit;
    const resident = {
      id: 'resident-1',
      name: 'Ana Garcia',
      unitId: unit.id,
    } as Resident;
    const residentRepository = {
      create: jest.fn().mockReturnValue(resident),
      save: jest.fn().mockResolvedValue(resident),
    };
    const userRepository = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn((value: User) => value),
      save: jest.fn((value: User) =>
        Promise.resolve({ id: 'user-1', ...value }),
      ),
    };
    const unitRepository = { findOne: jest.fn().mockResolvedValue(unit) };
    const manager = {
      getRepository: jest.fn(
        (entity: typeof Resident | typeof User | typeof ResidentialUnit) => {
          if (entity === Resident) return residentRepository;
          if (entity === User) return userRepository;
          return unitRepository;
        },
      ),
    };
    const dataSource = {
      transaction: jest.fn((work: (value: typeof manager) => unknown) =>
        work(manager),
      ),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new ResidentsService(
      {} as never,
      {} as never,
      dataSource as never,
      audit,
    );

    const result = await service.create(
      {
        name: 'Ana Garcia',
        email: ' ANA@EXAMPLE.COM ',
        unitId: unit.id,
        password: 'temporary-password',
      },
      actor,
    );

    expect(result).toEqual({ ...resident, email: 'ana@example.com' });
    expect(result).not.toHaveProperty('passwordHash');
    const persistedUser = userRepository.create.mock.calls[0][0];
    await expect(
      compare('temporary-password', persistedUser.passwordHash),
    ).resolves.toBe(true);
    expect(persistedUser.passwordHash).not.toBe('temporary-password');
    expect(audit.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        action: 'RESIDENT_CREATED',
        resourceId: resident.id,
      }),
    );
  });

  it.each([true, false])(
    'updates the resident and linked user active state to %s atomically',
    async (active) => {
      const resident = { id: 'resident-1', active: !active } as Resident;
      const saved = { ...resident, active };
      const residentRepository = {
        findOne: jest.fn().mockResolvedValue(resident),
        merge: jest.fn().mockReturnValue(saved),
        save: jest.fn().mockResolvedValue(saved),
      };
      const userRepository = {
        findOne: jest.fn().mockResolvedValue({ id: 'user-1' }),
        update: jest.fn().mockResolvedValue(undefined),
      };
      const unitRepository = {
        findOne: jest.fn().mockResolvedValue({
          id: resident.unitId,
          active: true,
        }),
      };
      const manager = {
        getRepository: jest.fn(
          (entity: typeof Resident | typeof User | typeof ResidentialUnit) =>
            entity === Resident
              ? residentRepository
              : entity === User
                ? userRepository
                : unitRepository,
        ),
      };
      const dataSource = {
        transaction: jest.fn(
          (work: (value: typeof manager) => Promise<Resident>) => work(manager),
        ),
      };
      const audit = { record: jest.fn().mockResolvedValue(undefined) };
      const service = new ResidentsService(
        {} as never,
        {} as never,
        dataSource as never,
        audit,
      );

      await expect(
        service.update(resident.id, { active }, actor),
      ).resolves.toBe(saved);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(userRepository.update).toHaveBeenCalledWith(
        { residentId: resident.id },
        { active },
      );
      expect(audit.record).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          action: active ? 'RESIDENT_ACTIVATED' : 'RESIDENT_REVOKED',
          resourceId: resident.id,
        }),
      );
    },
  );

  it('does not commit a resident when linked account creation fails', async () => {
    const committedResidents: Resident[] = [];
    const stagedResidents: Resident[] = [];
    const residentRepository = {
      create: jest.fn((value: Resident) => value),
      save: jest.fn((value: Resident) => {
        const saved: Resident = { id: 'resident-1', ...value };
        stagedResidents.push(saved);
        return Promise.resolve(saved);
      }),
    };
    const userRepository = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn((value: User) => value),
      save: jest.fn().mockRejectedValue(new Error('user insert failed')),
    };
    const manager = {
      getRepository: jest.fn((entity: typeof Resident | typeof User) =>
        entity === Resident
          ? residentRepository
          : entity === User
            ? userRepository
            : { findOne: jest.fn().mockResolvedValue({ id: 'unit-1' }) },
      ),
    };
    const dataSource = {
      transaction: jest.fn(async (work: (value: typeof manager) => unknown) => {
        const result = await work(manager);
        committedResidents.push(...stagedResidents);
        return result;
      }),
    };
    const audit = { record: jest.fn() };
    const service = new ResidentsService(
      {} as never,
      {} as never,
      dataSource as never,
      audit,
    );

    await expect(
      service.create(
        {
          name: 'Ana Garcia',
          email: 'ana@example.com',
          unitId: 'unit-1',
          password: 'temporary-password',
        },
        actor,
      ),
    ).rejects.toThrow('user insert failed');
    expect(stagedResidents).toHaveLength(1);
    expect(committedResidents).toHaveLength(0);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('locks the active target unit before creating a canonical resident identity', async () => {
    const unit = { id: 'unit-1', active: true } as ResidentialUnit;
    const resident = { id: 'resident-1', unitId: unit.id } as Resident;
    const units = { findOne: jest.fn().mockResolvedValue(unit) };
    const users = {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn((value: User) => value),
      save: jest.fn().mockResolvedValue({ email: 'ana@example.com' }),
    };
    const residents = {
      create: jest.fn().mockReturnValue(resident),
      save: jest.fn().mockResolvedValue(resident),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === ResidentialUnit ? units : entity === User ? users : residents,
      ),
    };
    const dataSource = {
      transaction: jest.fn((work) => work(manager)),
    };
    const service = new ResidentsService(
      {} as never,
      {} as never,
      dataSource as never,
      { record: jest.fn().mockResolvedValue(undefined) },
    );

    await service.create(
      {
        name: 'Ana Garcia',
        email: ' ANA@EXAMPLE.COM ',
        unitId: unit.id,
        password: 'temporary-password',
      },
      actor,
    );

    expect(units.findOne).toHaveBeenCalledWith({
      where: { id: unit.id, active: true },
      lock: { mode: 'pessimistic_write' },
    });
    expect(users.exists).toHaveBeenCalledWith({
      where: { email: 'ana@example.com' },
    });
  });

  it('rejects reactivation when its assigned unit is inactive', async () => {
    const resident = {
      id: 'resident-1',
      unitId: 'unit-1',
      active: false,
    } as Resident;
    const units = { findOne: jest.fn().mockResolvedValue(null) };
    const residents = {
      findOne: jest.fn().mockResolvedValue(resident),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === ResidentialUnit ? units : residents,
      ),
    };
    const service = new ResidentsService(
      { findOne: jest.fn().mockResolvedValue(resident) } as never,
      {} as never,
      { transaction: jest.fn((work) => work(manager)) } as never,
      {} as never,
    );

    await expect(
      service.update(resident.id, { active: true }, actor),
    ).rejects.toThrow('Unit must exist and be active');
    expect(units.findOne).toHaveBeenCalledWith({
      where: { id: resident.unitId, active: true },
      lock: { mode: 'pessimistic_write' },
    });
  });

  it('rejects an assignment that moves outside its deterministically locked units', async () => {
    const discovered = {
      id: 'resident-1',
      unitId: 'unit-z',
      active: true,
    } as Resident;
    const moved = { ...discovered, unitId: 'unit-b' } as Resident;
    const lockedUnitIds: string[] = [];
    const units = {
      findOne: jest.fn(({ where }) => {
        lockedUnitIds.push(where.id);
        return Promise.resolve({ id: where.id, active: true });
      }),
    };
    const residents = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(discovered)
        .mockResolvedValueOnce(moved),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === ResidentialUnit ? units : residents,
      ),
    };
    const service = new ResidentsService(
      {} as never,
      {} as never,
      { transaction: jest.fn((work) => work(manager)) } as never,
      {} as never,
    );

    await expect(
      service.update(discovered.id, { unitId: 'unit-a' }, actor),
    ).rejects.toThrow('Resident assignment changed during update');
    expect(lockedUnitIds).toEqual(['unit-a', 'unit-z']);
  });

  it('reassigns only after locking the current and active target units', async () => {
    const resident = {
      id: 'resident-1',
      unitId: 'unit-z',
      active: true,
    } as Resident;
    const saved = { ...resident, unitId: 'unit-a' } as Resident;
    const lockedUnitIds: string[] = [];
    const units = {
      findOne: jest.fn(({ where }) => {
        lockedUnitIds.push(where.id);
        return Promise.resolve({ id: where.id, active: true });
      }),
    };
    const residents = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(resident)
        .mockResolvedValueOnce(resident),
      merge: jest.fn().mockReturnValue(saved),
      save: jest.fn().mockResolvedValue(saved),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === ResidentialUnit ? units : residents,
      ),
    };
    const service = new ResidentsService(
      {} as never,
      {} as never,
      { transaction: jest.fn((work) => work(manager)) } as never,
      { record: jest.fn().mockResolvedValue(undefined) },
    );

    await expect(
      service.update(resident.id, { unitId: saved.unitId }, actor),
    ).resolves.toBe(saved);
    expect(lockedUnitIds).toEqual(['unit-a', 'unit-z']);
    expect(residents.save).toHaveBeenCalledWith(saved);
  });

  it('hides archived residents by default while keeping archive filtering independent from active', async () => {
    const query = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn().mockResolvedValue({ entities: [], raw: [] }),
    };
    const service = new ResidentsService(
      { createQueryBuilder: jest.fn().mockReturnValue(query) } as never,
      {} as never,
      { getRepository: jest.fn() } as never,
      {} as never,
    );

    await service.list({ page: 1, pageSize: 10, status: 'false' });
    await service.list({ page: 1, pageSize: 10, includeArchived: 'true' });

    expect(query.andWhere).toHaveBeenCalledWith('resident.archivedAt IS NULL');
    expect(query.andWhere).toHaveBeenCalledWith('resident.active = :status', {
      status: false,
    });
    expect(query.andWhere).toHaveBeenCalledTimes(2);
  });

  it('archives atomically after unit-first locks and disables the intact linked user', async () => {
    const unit = {
      id: 'unit-1', code: 'A-101', address: '101 Main Street', parkingSpaces: 1,
      active: true, createdAt: new Date(), updatedAt: new Date(),
    } as ResidentialUnit;
    const resident = {
      id: 'resident-1', unitId: 'unit-1', active: true, archivedAt: null, unit,
      createdAt: new Date(), updatedAt: new Date(),
    } as Resident;
    const saved = { ...resident, active: false, archivedAt: new Date() };
    const units = { findOne: jest.fn().mockResolvedValue(unit) };
    const residents = {
      findOne: jest.fn().mockResolvedValueOnce(resident).mockResolvedValueOnce(resident),
      save: jest.fn().mockResolvedValue(saved),
    };
    const users = {
      findOne: jest.fn().mockResolvedValue({ id: 'user-1', email: 'ana@example.com', role: Role.RESIDENT, residentId: resident.id, active: true }),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const manager = {
      getRepository: jest.fn((entity) => entity === ResidentialUnit ? units : entity === User ? users : residents),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new ResidentsService(
      {} as never, {} as never,
      { transaction: jest.fn((work) => work(manager)) } as never, audit,
    );

    await expect(service.archive(resident.id, actor)).resolves.toMatchObject({
      id: resident.id, active: false, archivedAt: saved.archivedAt?.toISOString(),
    });

    expect(units.findOne).toHaveBeenCalledWith({
      where: { id: resident.unitId }, lock: { mode: 'pessimistic_write' },
    });
    expect(users.save).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
    expect(residents.save).toHaveBeenCalledWith(expect.objectContaining({
      active: false, archivedByUserId: actor.sub,
    }));
    expect(audit.record).toHaveBeenCalledWith(manager, expect.objectContaining({
      action: 'RESIDENT_ARCHIVED', resourceId: resident.id,
    }));
  });

  it('restores archive metadata while persisting the resident and linked user as inactive', async () => {
    const unit = {
      id: 'unit-1', code: 'A-101', address: '101 Main Street', parkingSpaces: 1,
      active: true, createdAt: new Date(), updatedAt: new Date(),
    } as ResidentialUnit;
    const resident = {
      id: 'resident-1', unitId: unit.id, active: true, archivedAt: new Date(),
      archivedByUserId: actor.sub, unit, createdAt: new Date(), updatedAt: new Date(),
    } as Resident;
    const user = {
      id: 'user-1', email: 'ana@example.com', role: Role.RESIDENT,
      residentId: resident.id, active: true,
    } as User;
    const residents = {
      findOne: jest.fn().mockResolvedValueOnce(resident).mockResolvedValueOnce(resident),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    const users = {
      findOne: jest.fn().mockResolvedValue(user),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    const units = { findOne: jest.fn().mockResolvedValue(unit) };
    const manager = {
      getRepository: jest.fn((entity) => entity === ResidentialUnit ? units : entity === User ? users : residents),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new ResidentsService(
      {} as never, {} as never,
      { transaction: jest.fn((work) => work(manager)) } as never, audit,
    );

    await expect(service.restore(resident.id, actor)).resolves.toMatchObject({
      id: resident.id, active: false, archivedAt: null,
    });
    expect(residents.save).toHaveBeenCalledWith(expect.objectContaining({
      active: false, archivedAt: null, archivedByUserId: null,
    }));
    expect(users.save).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
  });

  it('rejects restore without an active unit or an intact resident identity', async () => {
    const resident = {
      id: 'resident-1', unitId: 'unit-1', active: false, archivedAt: new Date(),
    } as Resident;
    const units = { findOne: jest.fn().mockResolvedValue(null) };
    const residents = { findOne: jest.fn().mockResolvedValue(resident), save: jest.fn() };
    const users = { findOne: jest.fn().mockResolvedValue(null), save: jest.fn() };
    const manager = {
      getRepository: jest.fn((entity) => entity === ResidentialUnit ? units : entity === User ? users : residents),
    };
    const audit = { record: jest.fn() };
    const service = new ResidentsService(
      {} as never, {} as never,
      { transaction: jest.fn((work) => work(manager)) } as never, audit,
    );

    await expect(service.restore(resident.id, actor)).rejects.toThrow(
      'Unit must exist and be active',
    );
    expect(residents.save).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it.each([
    ['archive', { archivedAt: new Date(), active: false }],
    ['restore', { archivedAt: null, active: false }],
  ] as const)('keeps repeated %s commands as audit-free no-ops', async (operation, state) => {
    const resident = {
      id: 'resident-1', unitId: 'unit-1', ...state,
      createdAt: new Date(), updatedAt: new Date(),
      unit: {
        id: 'unit-1', code: 'A-101', address: '101 Main Street', parkingSpaces: 1,
        active: true, createdAt: new Date(), updatedAt: new Date(),
      },
    } as Resident;
    const residents = { findOne: jest.fn().mockResolvedValue(resident), save: jest.fn() };
    const manager = { getRepository: jest.fn(() => residents) };
    const audit = { record: jest.fn() };
    const service = new ResidentsService(
      {} as never, {} as never,
      { transaction: jest.fn((work) => work(manager)) } as never, audit,
    );

    await expect(service[operation](resident.id, actor)).resolves.toMatchObject({
      id: resident.id, active: false,
    });
    expect(residents.save).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
