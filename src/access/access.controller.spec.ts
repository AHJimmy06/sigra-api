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
    expect(rolesFor('listEvents')).toEqual([Role.ADMIN]);
    expect(rolesFor('list')).toEqual([Role.RESIDENT]);
    expect(rolesFor('create')).toEqual([Role.RESIDENT]);
    expect(rolesFor('qr')).toEqual([Role.RESIDENT]);
    expect(rolesFor('validate')).toEqual([Role.GUARD]);
  });

  it('forwards validated history queries to the access service', async () => {
    const access = { listEvents: jest.fn().mockResolvedValue({ items: [] }) };
    const controller = new AccessController(access as never);
    const query = { page: 2, pageSize: 25 };

    await controller.listEvents(query);

    expect(access.listEvents).toHaveBeenCalledWith(query);
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
