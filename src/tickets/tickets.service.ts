import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceTicket } from './ticket.entity';
import { CreateTicketDto, UpdateTicketDto } from './ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(MaintenanceTicket)
    private readonly ticketRepository: Repository<MaintenanceTicket>,
  ) {}

  async list(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
  }) {
    const { page, pageSize, search, status } = params;
    const query = this.ticketRepository.createQueryBuilder('ticket');

    if (search) {
      query.andWhere('ticket.title ILIKE :search', { search: `%${search}%` });
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

  async create(dto: CreateTicketDto, residentId?: string) {
    const ticket = this.ticketRepository.create({ ...dto, residentId });
    return await this.ticketRepository.save(ticket);
  }

  // Usamos UpdateTicketDto que es el nombre estándar del DTO en tu proyecto
  async updateStatus(id: string, dto: UpdateTicketDto) {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found.');
    }
    Object.assign(ticket, dto);
    return await this.ticketRepository.save(ticket);
  }
}
