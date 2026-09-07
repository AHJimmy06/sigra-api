import {
  Body,
  Controller,
  Delete,
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
  UpdateAnnouncementDto,
} from './announcement.dto';
import { AnnouncementsService } from './announcements.service';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.RESIDENT)
  @ApiOkResponse({ type: PaginatedAnnouncementsResponseDto })
  list(
    @Query() query: AnnouncementPaginationQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.announcementsService.list(query, user);
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
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.announcementsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.announcementsService.remove(id, user);
  }
}
