import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { Role } from '../common/role.enum';
import { TicketPaginationQueryDto, UpdateTicketDto } from './ticket.dto';
import { MaintenanceTicket, TicketStatus } from './ticket.entity';

interface TicketHistoryRow {
  audit_id: string;
  metadata: {
    status?: {
      from?: string | null;
      to?: string | null;
    };
  } | null;
  created_at: Date;
  actor_role: Role | null;
}

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED],
  [TicketStatus.RESOLVED]: [],
};

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(MaintenanceTicket)
    private readonly ticketRepository: Repository<MaintenanceTicket>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async list(params: TicketPaginationQueryDto, user: AuthUser) {
    const query = this.ticketRepository.createQueryBuilder('ticket');
    this.scope(query, user);
    if (params.search) {
      query.andWhere('ticket.description ILIKE :search', {
        search: `%${params.search}%`,
      });
    }
    if (params.status)
      query.andWhere('ticket.status = :status', { status: params.status });
    if (params.priority) {
      query.andWhere('ticket.priority = :priority', {
        priority: params.priority,
      });
    }
    query
      .orderBy('ticket.createdAt', 'DESC')
      .addOrderBy('ticket.id', 'DESC')
      .skip((params.page - 1) * params.pageSize)
      .take(params.pageSize);
    const [items, total] = await query.getManyAndCount();
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  async findOne(id: string, user: AuthUser) {
    const query = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.resident', 'resident')
      .where('ticket.id = :id', { id });
    this.scope(query, user);
    const ticket = await query.getOne();
    if (!ticket) throw new NotFoundException('Ticket not found');

    const history = await this.dataSource.query<TicketHistoryRow[]>(
      `SELECT * FROM audit_logs WHERE resource_type = 'TICKET' AND resource_id = $1 ORDER BY created_at ASC`,
      [id],
    );

    return {
      id: ticket.id,
      clientRequestId: ticket.clientRequestId,
      residentId: ticket.residentId,
      description: ticket.description,
      imageName: ticket.imageName,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resident: ticket.resident
        ? { id: ticket.resident.id, name: ticket.resident.name }
        : undefined,
      attachments: ticket.imageName
        ? [
            {
              id: ticket.imageName,
              name: ticket.imageName,
              url: `/api/tickets/images/${ticket.imageName}`,
              contentType: 'image/jpeg',
            },
          ]
        : [],
      history: history.map((h) => ({
        id: h.audit_id,
        from: h.metadata?.status?.from || null,
        to: h.metadata?.status?.to || null,
        createdAt: h.created_at,
        actorName: h.actor_role,
      })),
    };
  }

  findByClientRequestId(clientRequestId: string, residentId: string) {
    return this.ticketRepository.findOneBy({ clientRequestId, residentId });
  }

  async create(
    clientRequestId: string,
    residentId: string,
    description: string,
    imageName: string,
  ) {
    const existing = await this.findByClientRequestId(
      clientRequestId,
      residentId,
    );
    if (existing) return existing;
    try {
      return await this.ticketRepository.save(
        this.ticketRepository.create({
          clientRequestId,
          residentId,
          description,
          imageName,
        }),
      );
    } catch (error) {
      const duplicate = await this.findByClientRequestId(
        clientRequestId,
        residentId,
      );
      if (duplicate) return duplicate;
      throw error;
    }
  }

  async authorizeImage(imageName: string, user: AuthUser) {
    if (user.role === Role.GUARD)
      throw new ForbiddenException('Insufficient role');
    const ticket = await this.ticketRepository.findOneBy(
      user.role === Role.ADMIN
        ? { imageName }
        : { imageName, residentId: user.residentId ?? '' },
    );
    if (!ticket) throw new NotFoundException('Ticket image not found');
    return ticket;
  }

  updateStatus(id: string, dto: UpdateTicketDto, actor: AuthUser) {
    return this.dataSource.transaction(async (manager) => {
      const tickets = manager.getRepository(MaintenanceTicket);
      const ticket = await tickets.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!ticket) throw new NotFoundException('Ticket not found');

      if (ticket.status === dto.status) {
        return ticket;
      }

      if (!ALLOWED_TRANSITIONS[ticket.status].includes(dto.status)) {
        throw new ConflictException({
          message: 'Invalid ticket status transition',
          details: {
            status: [
              `Cannot transition from ${ticket.status} to ${dto.status}`,
            ],
          },
        });
      }
      const previousStatus = ticket.status;
      ticket.status = dto.status;
      const saved = await tickets.save(ticket);
      await this.audit.record(manager, {
        actor,
        action: 'TICKET_STATUS_CHANGED',
        resourceType: 'TICKET',
        resourceId: id,
        metadata: { status: { from: previousStatus, to: dto.status } },
      });
      return saved;
    });
  }

  private scope(
    query: ReturnType<Repository<MaintenanceTicket>['createQueryBuilder']>,
    user: AuthUser,
  ) {
    if (user.role === Role.ADMIN) return;
    if (user.role === Role.RESIDENT && user.residentId) {
      query.andWhere('ticket.residentId = :residentId', {
        residentId: user.residentId,
      });
      return;
    }
    throw new ForbiddenException('Insufficient role');
  }
}
