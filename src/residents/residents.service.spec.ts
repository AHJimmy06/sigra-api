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
      const userRepository = { update: jest.fn().mockResolvedValue(undefined) };
      const manager = {
        getRepository: jest.fn((entity: typeof Resident | typeof User) =>
          entity === Resident ? residentRepository : userRepository,
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
});
