import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../common/role.enum';
import { MaintenanceTicket, TicketStatus } from './ticket.entity';
import { TicketsService } from './tickets.service';

const admin = {
  sub: 'admin-1',
  email: 'admin@example.com',
  role: Role.ADMIN,
  residentId: null,
};
const resident = {
  sub: 'user-1',
  email: 'resident@example.com',
  role: Role.RESIDENT,
  residentId: 'resident-1',
};

function queryBuilder() {
  return {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
}

describe('TicketsService', () => {
  it('paginates, filters, and deterministically orders resident-scoped tickets', async () => {
    const query = queryBuilder();
    const repository = { createQueryBuilder: jest.fn().mockReturnValue(query) };
    const service = new TicketsService(
      repository as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.list(
        { page: 2, pageSize: 10, search: 'leak', status: TicketStatus.OPEN },
        resident,
      ),
    ).resolves.toEqual({ items: [], total: 0, page: 2, pageSize: 10 });
    expect(query.andWhere).toHaveBeenCalledWith(
      'ticket.residentId = :residentId',
      { residentId: 'resident-1' },
    );
    expect(query.addOrderBy).toHaveBeenCalledWith('ticket.id', 'DESC');
    expect(query.skip).toHaveBeenCalledWith(10);
  });

  it('rejects ticket listing for guards', async () => {
    const query = queryBuilder();
    const service = new TicketsService(
      { createQueryBuilder: jest.fn().mockReturnValue(query) } as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.list({ page: 1, pageSize: 10 }, { ...admin, role: Role.GUARD }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns an idempotent resident-scoped ticket without inserting', async () => {
    const existing = { id: 'ticket-1' } as MaintenanceTicket;
    const repository = {
      findOneBy: jest.fn().mockResolvedValue(existing),
      create: jest.fn(),
      save: jest.fn(),
    };
    const service = new TicketsService(
      repository as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.create('request-1', 'resident-1', 'Leaking pipe', 'image.png'),
    ).resolves.toBe(existing);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('audits valid status transitions atomically', async () => {
    const ticket = {
      id: 'ticket-1',
      status: TicketStatus.OPEN,
    } as MaintenanceTicket;
    const repository = {
      findOne: jest.fn().mockResolvedValue(ticket),
      save: jest
        .fn()
        .mockResolvedValue({ ...ticket, status: TicketStatus.IN_PROGRESS }),
    };
    const manager = { getRepository: jest.fn().mockReturnValue(repository) };
    const dataSource = {
      transaction: jest.fn((work: (value: typeof manager) => unknown) =>
        work(manager),
      ),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new TicketsService({} as never, dataSource as never, audit);
    await service.updateStatus(
      ticket.id,
      { status: TicketStatus.IN_PROGRESS },
      admin,
    );
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: ticket.id },
      lock: { mode: 'pessimistic_write' },
    });
    expect(audit.record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        action: 'TICKET_STATUS_CHANGED',
        resourceId: ticket.id,
      }),
    );
  });

  it('rejects invalid status transitions', async () => {
    const repository = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'ticket-1', status: TicketStatus.RESOLVED }),
    };
    const manager = { getRepository: jest.fn().mockReturnValue(repository) };
    const dataSource = {
      transaction: jest.fn((work: (value: typeof manager) => unknown) =>
        work(manager),
      ),
    };
    const service = new TicketsService(
      {} as never,
      dataSource as never,
      {} as never,
    );
    await expect(
      service.updateStatus('ticket-1', { status: TicketStatus.OPEN }, admin),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not expose another resident ticket image', async () => {
    const repository = { findOneBy: jest.fn().mockResolvedValue(null) };
    const service = new TicketsService(
      repository as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.authorizeImage('other.png', resident),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findOneBy).toHaveBeenCalledWith({
      imageName: 'other.png',
      residentId: 'resident-1',
    });
  });
});
