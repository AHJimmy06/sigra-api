import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceTicket } from './ticket.entity';
import { CreateTicketDto, UpdateTicketDto } from './ticket.dto';
import { Role } from '../common/role.enum';

interface AuthUser {
  userId: string;
  role: Role;
  residentId?: string;
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(MaintenanceTicket)
    private readonly ticketRepository: Repository<MaintenanceTicket>,
  ) {}

  // Método list con tu paginación de la Fase 0 y seguridad por roles
  async list(
    params: {
      page: number;
      pageSize: number;
      search?: string;
      status?: string;
    },
    user: AuthUser,
  ) {
    const { page, pageSize, search, status } = params;
    const query = this.ticketRepository.createQueryBuilder('ticket');

    // Validación de roles que traía tu compañero
    if (user.role === Role.RESIDENT && user.residentId) {
      query.andWhere('ticket.residentId = :residentId', {
        residentId: user.residentId,
      });
    } else if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Insufficient role');
    }

    if (search) {
      query.andWhere(
        '(ticket.title ILIKE :search OR ticket.description ILIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    if (status) {
      query.andWhere('ticket.status = :status', { status });
    }

    query.skip((page - 1) * pageSize).take(pageSize);
    query.orderBy('ticket.createdAt', 'DESC');

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async findByClientRequestId(
    clientRequestId: string,
    residentId: string,
  ): Promise<MaintenanceTicket | null> {
    return this.ticketRepository.findOneBy({ clientRequestId, residentId });
  }

  async create(dto: CreateTicketDto, residentId: string) {
    const existing = await this.findByClientRequestId(
      dto.clientRequestId,
      residentId,
    );
    if (existing) return existing;

    try {
      const ticket = this.ticketRepository.create({
        ...dto,
        residentId,
      });
      return await this.ticketRepository.save(ticket);
    } catch (error) {
      const duplicate = await this.findByClientRequestId(
        dto.clientRequestId,
        residentId,
      );
      if (duplicate) return duplicate;
      throw error;
    }
  }

  async authorizeImage(imageName: string, user: AuthUser) {
    const ticket = await this.ticketRepository.findOneBy(
      user.role === Role.ADMIN
        ? { imageName }
        : { imageName, residentId: user.residentId },
    );
    if (!ticket)
      throw new NotFoundException('Ticket image not found or unauthorized.');
    return ticket;
  }

  async updateStatus(id: string, dto: UpdateTicketDto) {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found.');
    }
    Object.assign(ticket, dto);
    return await this.ticketRepository.save(ticket);
  }
}
