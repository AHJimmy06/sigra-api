import { ROLES_KEY } from '../common/roles.decorator';
import { Role } from '../common/role.enum';
import { AccessController } from './access.controller';
import { Reflector } from '@nestjs/core';

describe('AccessController provisioning boundary', () => {
  it('is resident-only and scopes provisioning to the token resident id', async () => {
    const access = {
      provision: jest.fn().mockResolvedValue({ passId: 'pass-1' }),
    };
    const controller = new AccessController(access as never);
    const roles = new Reflector().get<Role[]>(
      ROLES_KEY,
      // Decorator metadata is attached to the prototype method itself.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      AccessController.prototype.provision,
    );

    expect(roles).toEqual([Role.RESIDENT]);
    await controller.provision(
      {
        sub: 'user-1',
        email: 'resident@example.com',
        role: Role.RESIDENT,
        residentId: 'resident-1',
      },
      'pass-1',
    );
    expect(access.provision.mock.calls).toEqual([['resident-1', 'pass-1']]);
  });
});
