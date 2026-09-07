import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '../common/role.enum';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateTicketDto, UpdateTicketDto } from './ticket.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.RESIDENT)
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.ticketsService.list({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
      search,
      status,
    });
  }

  @Post()
  @Roles(Role.RESIDENT) // Los residentes crean los tickets
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTicketDto) {
    return this.ticketsService.create(dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN) // Solo el admin o personal autorizado cambia estado
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.updateStatus(id, dto);
  }
}
