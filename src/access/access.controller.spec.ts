import { Reflector } from '@nestjs/core';
import { Role } from '../common/role.enum';
import { ROLES_KEY } from '../common/roles.decorator';
import { AccessController } from './access.controller';

describe('AccessController authorization boundary', () => {
  const reflector = new Reflector();
  const rolesFor = (method: keyof AccessController) => {
    const handler: unknown = Object.getOwnPropertyDescriptor(
      AccessController.prototype,
      method,
    )?.value;
    if (typeof handler !== 'function') throw new Error('Handler not found');
    return reflector.get<Role[]>(ROLES_KEY, handler);
  };

  it('keeps pass operations resident-only and validation guard-only', () => {
    expect(rolesFor('list')).toEqual([Role.RESIDENT]);
    expect(rolesFor('create')).toEqual([Role.RESIDENT]);
    expect(rolesFor('qr')).toEqual([Role.RESIDENT]);
    expect(rolesFor('validate')).toEqual([Role.GUARD]);
  });

  it('scopes QR rendering to the authenticated resident', async () => {
    const access = {
      currentQr: jest.fn().mockResolvedValue({ payload: '{}' }),
    };
    const controller = new AccessController(access as never);

    await controller.qr(
      {
        sub: 'user-1',
        email: 'resident@example.com',
        role: Role.RESIDENT,
        residentId: 'resident-1',
      },
      'pass-1',
    );

    expect(access.currentQr).toHaveBeenCalledWith('resident-1', 'pass-1');
  });
});
