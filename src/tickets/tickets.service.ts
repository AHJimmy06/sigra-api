import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/auth.types';
import { Role } from '../common/role.enum';
import { MaintenanceTicket, TicketStatus } from './ticket.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(MaintenanceTicket)
    private readonly tickets: Repository<MaintenanceTicket>,
  ) {}
  list(user: AuthUser) {
    if (user.role === Role.ADMIN)
      return this.tickets.find({ order: { createdAt: 'DESC' } });
    if (user.role === Role.RESIDENT && user.residentId)
      return this.tickets.find({
        where: { residentId: user.residentId },
        order: { createdAt: 'DESC' },
      });
    throw new ForbiddenException('Insufficient role');
  }
  findByClientRequestId(clientRequestId: string, residentId: string) {
    return this.tickets.findOneBy({ clientRequestId, residentId });
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
      return await this.tickets.save(
        this.tickets.create({
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

    const ticket = await this.tickets.findOneBy(
      user.role === Role.ADMIN
        ? { imageName }
        : { imageName, residentId: user.residentId ?? '' },
    );
    if (!ticket) throw new NotFoundException('Ticket image not found');
  }
  async update(id: string, status: TicketStatus) {
    const ticket = await this.tickets.findOneBy({ id });
    if (!ticket) throw new NotFoundException('Ticket not found');
    ticket.status = status;
    return this.tickets.save(ticket);
  }
}
