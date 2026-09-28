import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '../common/role.enum';
import { User } from '../users/user.entity';
import { GuardAuthorizationService } from './guard-authorization.service';

const admin = {
  sub: 'admin-1',
  email: 'admin@example.test',
  role: Role.ADMIN,
  residentId: null,
};

function setup(guard: Partial<User> | null) {
  const entity = {
    id: 'guard-1',
    role: Role.GUARD,
    active: true,
    guardGateAuthorized: false,
    ...guard,
  } as User;
  const auditLogs = {
    create: jest.fn((value: Record<string, unknown>) => value),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const users = {
    findOne: jest.fn().mockResolvedValue(entity),
    save: jest.fn().mockResolvedValue(entity),
  };
  const manager = {
    getRepository: jest.fn((type: unknown) =>
      type === User ? users : auditLogs,
    ),
  };
  const dataSource = {
    transaction: jest.fn((work: (value: typeof manager) => unknown) =>
      work(manager),
    ),
  };
  return {
    service: new GuardAuthorizationService(dataSource as never),
    dataSource,
    users,
    auditLogs,
    manager,
    entity,
  };
}

describe('GuardAuthorizationService', () => {
  it('grants and revokes with a single transactional audit event each', async () => {
    const context = setup({});
    await expect(
      context.service.setAuthorization('guard-1', true, admin, '127.0.0.1'),
    ).resolves.toEqual({ id: 'guard-1', authorized: true });
    expect(context.dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(context.users.findOne).toHaveBeenCalledWith({
      where: { id: 'guard-1' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(context.auditLogs.save).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: admin.sub,
        actorRole: Role.ADMIN,
        action: 'GUARD_GATE_AUTHORIZATION_GRANTED',
        resourceType: 'USER',
        resourceId: 'guard-1',
        metadata: { from: false, to: true },
        ip: '127.0.0.1',
      }),
    );

    context.entity.guardGateAuthorized = true;
    await context.service.setAuthorization('guard-1', false, admin);
    expect(context.users.save).toHaveBeenCalledTimes(2);
    expect(context.auditLogs.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: 'GUARD_GATE_AUTHORIZATION_REVOKED',
        metadata: { from: true, to: false },
      }),
    );
  });

  it('does not write or audit an unchanged authorization state', async () => {
    const context = setup({ guardGateAuthorized: true });
    await context.service.setAuthorization('guard-1', true, admin);
    expect(context.users.save).not.toHaveBeenCalled();
    expect(context.auditLogs.save).not.toHaveBeenCalled();
  });

  it('rejects missing, non-GUARD, or inactive grant targets', async () => {
    const missing = setup(null);
    missing.users.findOne.mockResolvedValue(null);
    await expect(
      missing.service.setAuthorization('missing', true, admin),
    ).rejects.toBeInstanceOf(NotFoundException);

    const wrongRole = setup({ role: Role.ADMIN });
    await expect(
      wrongRole.service.setAuthorization('admin-1', true, admin),
    ).rejects.toBeInstanceOf(NotFoundException);

    const inactive = setup({ active: false });
    await expect(
      inactive.service.setAuthorization('guard-1', true, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(inactive.users.save).not.toHaveBeenCalled();
    expect(inactive.auditLogs.save).not.toHaveBeenCalled();
  });

  it('propagates audit failure so the enclosing transaction rolls back', async () => {
    const context = setup({});
    const failure = new Error('audit unavailable');
    context.auditLogs.save.mockRejectedValue(failure);
    await expect(
      context.service.setAuthorization('guard-1', true, admin),
    ).rejects.toBe(failure);
    expect(context.dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});
