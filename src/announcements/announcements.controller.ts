import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '../common/role.enum';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './announcement.dto';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}
  @Get() @Roles(Role.ADMIN) adminList() {
    return this.announcements.adminList();
  }
  @Get('published') @Roles(Role.RESIDENT) published() {
    return this.announcements.published();
  }
  @Post() @Roles(Role.ADMIN) create(@Body() dto: CreateAnnouncementDto) {
    return this.announcements.create(dto);
  }
  @Patch(':id') @Roles(Role.ADMIN) update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcements.update(id, dto);
  }
  @Delete(':id') @Roles(Role.ADMIN) remove(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.announcements.remove(id);
  }
}
