import {
  Body,
  Controller,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Role } from '../common/role.enum';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateTicketDto, UpdateTicketDto } from './ticket.dto';
import { TicketImageStorage } from './ticket-image.storage';
import { TicketsService } from './tickets.service';

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly images: TicketImageStorage,
  ) {}
  @Get() @Roles(Role.ADMIN) list() {
    return this.tickets.list();
  }
  @Post()
  @Roles(Role.RESIDENT)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) =>
        callback(
          null,
          ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype),
        ),
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
    this.images.validate(file);
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
  @Patch(':id') @Roles(Role.ADMIN) update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.tickets.update(id, dto.status);
  }
  @Get('images/:name') @Roles(Role.ADMIN, Role.RESIDENT) async image(
    @CurrentUser() user: AuthUser,
    @Param('name') name: string,
    @Res() response: Response,
  ) {
    if (!/^[0-9a-f-]+\.(jpg|jpeg|png|webp)$/i.test(name))
      return response.status(400).json({ message: 'Invalid image name' });
    await this.tickets.authorizeImage(name, user);
    return response.sendFile(name, { root: this.images.root() });
  }
}
