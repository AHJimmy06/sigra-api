import { Role } from '../common/role.enum';
import { User } from '../users/user.entity';
import { SeedService } from './seed.service';

describe('SeedService', () => {
  const password = 'development-password';

  function withSeedEnvironment(values: Record<string, string | undefined>) {
    const previous = { ...process.env };
    process.env = {
      ...previous,
      NODE_ENV: 'development',
      SEED_DEVELOPMENT_ACCOUNTS: 'true',
      ...values,
    };
    return () => {
      process.env = previous;
    };
  }

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

  it('preserves valid ADMIN names and fills only null ADMIN and GUARD names', async () => {
    const admin = { email: 'admin@example.com', displayName: 'Existing Admin' };
    const guard = { email: 'guard@example.com', displayName: null };
    const users = {
      existsBy: jest.fn().mockResolvedValue(true),
      findOneBy: jest.fn(({ email }: { email: string }) =>
        Promise.resolve(email === admin.email ? admin : guard),
      ),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const restore = withSeedEnvironment({
      SEED_ADMIN_EMAIL: admin.email,
      SEED_ADMIN_PASSWORD: password,
      SEED_GUARD_EMAIL: guard.email,
      SEED_GUARD_PASSWORD: password,
    });

    try {
      await new SeedService(
        users as never,
        {} as never,
      ).onApplicationBootstrap();
    } finally {
      restore();
    }

    expect(users.save).toHaveBeenCalledTimes(1);
    expect(users.save).toHaveBeenCalledWith({
      email: 'guard@example.com',
      displayName: 'Development Guard',
    });
    expect(admin.displayName).toBe('Existing Admin');
  });

  it('trims the configured resident name before creating resident data', async () => {
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
    const restore = withSeedEnvironment({
      SEED_RESIDENT_EMAIL: 'resident@example.com',
      SEED_RESIDENT_PASSWORD: password,
      SEED_RESIDENT_NAME: '  Configured Resident  ',
    });

    try {
      await new SeedService(
        users as never,
        dataSource as never,
      ).onApplicationBootstrap();
    } finally {
      restore();
    }

    expect(residents.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Configured Resident' }),
    );
  });

  it('rejects an invalid resident name before any seed writes', async () => {
    const users = {
      existsBy: jest.fn(),
      save: jest.fn(),
    };
    const dataSource = { transaction: jest.fn() };
    const restore = withSeedEnvironment({
      SEED_ADMIN_EMAIL: 'admin@example.com',
      SEED_ADMIN_PASSWORD: password,
      SEED_RESIDENT_EMAIL: 'resident@example.com',
      SEED_RESIDENT_PASSWORD: password,
      SEED_RESIDENT_NAME: '   ',
    });

    try {
      await expect(
        new SeedService(
          users as never,
          dataSource as never,
        ).onApplicationBootstrap(),
      ).rejects.toThrow(
        'Seed resident name must be between 1 and 120 characters',
      );
    } finally {
      restore();
    }

    expect(users.existsBy).not.toHaveBeenCalled();
    expect(users.save).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('fills a null existing resident name without recreating resident data', async () => {
    const residentUser = {
      email: 'resident@example.com',
      displayName: null,
    };
    const users = {
      existsBy: jest.fn().mockResolvedValue(true),
      findOneBy: jest.fn().mockResolvedValue(residentUser),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const manager = { getRepository: jest.fn().mockReturnValue(users) };
    const dataSource = {
      transaction: jest.fn((work: (value: typeof manager) => unknown) =>
        work(manager),
      ),
    };
    const restore = withSeedEnvironment({
      SEED_RESIDENT_EMAIL: residentUser.email,
      SEED_RESIDENT_PASSWORD: password,
    });

    try {
      const service = new SeedService(users as never, dataSource as never);
      await service.onApplicationBootstrap();
      await service.onApplicationBootstrap();
    } finally {
      restore();
    }

    expect(users.save).toHaveBeenCalledTimes(1);
    expect(users.save).toHaveBeenCalledWith({
      email: 'resident@example.com',
      displayName: 'Development Resident',
    });
    expect(manager.getRepository).toHaveBeenCalledWith(User);
  });
});
