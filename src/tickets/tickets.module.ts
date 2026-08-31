import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MaintenanceTicket } from './ticket.entity';
import { TicketImageStorage } from './ticket-image.storage';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
@Module({
  imports: [TypeOrmModule.forFeature([MaintenanceTicket]), AuthModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketImageStorage],
})
export class TicketsModule {}
