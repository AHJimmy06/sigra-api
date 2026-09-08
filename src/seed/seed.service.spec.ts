import { Role } from '../common/role.enum';
import { SeedService } from './seed.service';

describe('SeedService', () => {
  it('creates a coherent development resident, unit, and user', async () => {
    const users = {
      existsBy: jest.fn().mockResolvedValue(false),
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn((value: Record<string, unknown>) =>
        Promise.resolve({ ...value, id: 'user-1' }),
      ),
    };
    const residents = {
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn((value: Record<string, unknown>) =>
        Promise.resolve({ ...value, id: 'resident-1' }),
      ),
    };
    const units = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn((value: Record<string, unknown>) =>
        Promise.resolve({ ...value, id: 'unit-1' }),
      ),
    };
    const manager = {
      getRepository: jest.fn((entity: { name: string }) => {
        if (entity.name === 'User') return users;
        if (entity.name === 'Resident') return residents;
        return units;
      }),
    };
    const dataSource = {
      transaction: jest.fn((work: (value: typeof manager) => unknown) =>
        work(manager),
      ),
    };
    const previous = { ...process.env };
    Object.assign(process.env, {
      NODE_ENV: 'development',
      SEED_DEVELOPMENT_ACCOUNTS: 'true',
      SEED_RESIDENT_EMAIL: 'Resident@Example.com',
      SEED_RESIDENT_PASSWORD: 'resident-password',
    });
    try {
      await new SeedService(
        users as never,
        dataSource as never,
      ).onApplicationBootstrap();
    } finally {
      process.env = previous;
    }

    expect(units.save).toHaveBeenCalledTimes(1);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(residents.save).toHaveBeenCalledWith(
      expect.objectContaining({ unitId: 'unit-1' }),
    );
    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'resident@example.com',
        role: Role.RESIDENT,
        residentId: 'resident-1',
      }),
    );
  });
});
