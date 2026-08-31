import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '../common/role.enum';
import { MaintenanceTicket } from './ticket.entity';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  it('returns the resident-scoped existing ticket without inserting', async () => {
    const existing = { id: 'ticket-1' } as MaintenanceTicket;
    const repository = {
      findOneBy: jest.fn().mockResolvedValue(existing),
      create: jest.fn(),
      save: jest.fn(),
    };
    const service = new TicketsService(repository as never);

    await expect(
      service.create('request-1', 'resident-1', 'Leak', 'image.png'),
    ).resolves.toBe(existing);
    expect(repository.findOneBy).toHaveBeenCalledWith({
      clientRequestId: 'request-1',
      residentId: 'resident-1',
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('allows an admin to retrieve a referenced ticket image', async () => {
    const repository = {
      findOneBy: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
    };
    const service = new TicketsService(repository as never);

    await expect(
      service.authorizeImage('image.png', {
        sub: 'admin-1',
        email: 'admin@example.com',
        role: Role.ADMIN,
        residentId: null,
      }),
    ).resolves.toBeUndefined();
    expect(repository.findOneBy).toHaveBeenCalledWith({
      imageName: 'image.png',
    });
  });

  it('scopes resident image lookup to the authenticated resident', async () => {
    const repository = { findOneBy: jest.fn().mockResolvedValue(null) };
    const service = new TicketsService(repository as never);

    await expect(
      service.authorizeImage('other-resident.png', {
        sub: 'resident-user-1',
        email: 'resident@example.com',
        role: Role.RESIDENT,
        residentId: 'resident-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findOneBy).toHaveBeenCalledWith({
      imageName: 'other-resident.png',
      residentId: 'resident-1',
    });
  });

  it('does not grant guards ticket image access', async () => {
    const repository = { findOneBy: jest.fn() };
    const service = new TicketsService(repository as never);

    await expect(
      service.authorizeImage('image.png', {
        sub: 'guard-1',
        email: 'guard@example.com',
        role: Role.GUARD,
        residentId: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.findOneBy).not.toHaveBeenCalled();
  });
});
