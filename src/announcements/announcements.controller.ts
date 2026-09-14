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
import {
  AnnouncementResponseDto,
  AnnouncementPaginationQueryDto,
  CreateAnnouncementDto,
  PaginatedAnnouncementsResponseDto,
} from './announcement.dto';
import { AnnouncementsService } from './announcements.service';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { AnnouncementPatchPipe } from './announcement-patch.pipe';
import type { AnnouncementPatchCommand } from './announcement-patch.pipe';

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

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: AnnouncementResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAnnouncementDto) {
    return this.announcementsService.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new AnnouncementPatchPipe()) command: AnnouncementPatchCommand,
    @CurrentUser() user: AuthUser,
  ) {
    return this.announcementsService.update(id, command, user);
  }

  @Post(':id/archive')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AnnouncementResponseDto })
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.announcementsService.archive(id, user);
  }
}
