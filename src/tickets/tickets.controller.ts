import {
  Body,
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Role } from '../common/role.enum';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import {
  CreateTicketDto,
  PaginatedTicketsResponseDto,
  TicketPaginationQueryDto,
  TicketResponseDto,
  UpdateTicketDto,
} from './ticket.dto';
import { TicketImageStorage } from './ticket-image.storage';
import { TicketsService } from './tickets.service';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly images: TicketImageStorage,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.RESIDENT)
  @ApiOkResponse({ type: PaginatedTicketsResponseDto })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: TicketPaginationQueryDto,
  ) {
    return this.tickets.list(query, user);
  }

  @Get('images/:name')
  @Roles(Role.ADMIN, Role.RESIDENT)
  async image(@CurrentUser() user: AuthUser, @Param('name') name: string) {
    if (!/^[0-9a-f-]+\.(jpg|jpeg|png|webp)$/i.test(name)) {
      throw new BadRequestException('Invalid image name');
    }
    await this.tickets.authorizeImage(name, user);
    return new StreamableFile(await this.images.read(name));
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.RESIDENT)
  @ApiOkResponse({ type: TicketResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tickets.findOne(id, user);
  }

  @Post()
  @Roles(Role.RESIDENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: TicketResponseDto })
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTicketDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    const residentId = user.residentId!;
    const existing = await this.tickets.findByClientRequestId(
      dto.clientRequestId,
      residentId,
    );
    if (existing) return existing;
    const imageName = await this.images.store(file);
    try {
      const ticket = await this.tickets.create(
        dto.clientRequestId,
        residentId,
        dto.description,
        imageName,
      );
      if (ticket.imageName !== imageName) await this.images.remove(imageName);
      return ticket;
    } catch (error) {
      await this.images.remove(imageName);
      throw error;
    }
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tickets.updateStatus(id, dto, user);
  }
}
