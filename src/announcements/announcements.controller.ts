import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '../common/role.enum';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import {
  AnnouncementResponseDto,
  AnnouncementPaginationQueryDto,
  PaginatedAnnouncementsResponseDto,
} from './announcement.dto';
import { AnnouncementsService } from './announcements.service';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOkResponse({ type: PaginatedAnnouncementsResponseDto })
  list(@Query() query: AnnouncementPaginationQueryDto) {
    return this.announcementsService.list(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOkResponse({ type: AnnouncementResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.announcementsService.findOne(id);
  }
}
