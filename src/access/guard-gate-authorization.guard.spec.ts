import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '../common/role.enum';
import { GuardGateAuthorizationGuard } from './guard-gate-authorization.guard';

describe('GuardGateAuthorizationGuard', () => {
  function context(user: unknown) {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as ExecutionContext;
  }

  it('requires a fresh persisted authorization for the authenticated guard', async () => {
    const users = {
      findOne: jest.fn().mockResolvedValue({
        id: 'guard-1',
        guardGateAuthorized: true,
      }),
    };
    const guard = new GuardGateAuthorizationGuard(users as never);
    const actor = {
      sub: 'guard-1',
      email: 'guard@example.test',
      role: Role.GUARD,
      residentId: null,
    };

    await expect(guard.canActivate(context(actor))).resolves.toBe(true);
    expect(users.findOne).toHaveBeenCalledWith({
      where: { id: actor.sub, role: Role.GUARD, active: true },
      select: { id: true, guardGateAuthorized: true },
    });
  });

  it.each([
    ['missing user', undefined],
    ['non-GUARD token role', { sub: 'admin-1', role: Role.ADMIN }],
  ])('denies %s', async (_label, actor) => {
    const users = { findOne: jest.fn() };
    const guard = new GuardGateAuthorizationGuard(users as never);
    await expect(guard.canActivate(context(actor))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(users.findOne).not.toHaveBeenCalled();
  });

  it.each([null, { id: 'guard-1', guardGateAuthorized: false }])(
    'denies absent or default-denied persisted grant %p',
    async (persisted) => {
      const users = { findOne: jest.fn().mockResolvedValue(persisted) };
      const guard = new GuardGateAuthorizationGuard(users as never);
      await expect(
        guard.canActivate(context({ sub: 'guard-1', role: Role.GUARD })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );
});
