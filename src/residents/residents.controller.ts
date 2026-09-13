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
  CreateResidentDto,
  PaginatedResidentsResponseDto,
  ResidentResponseDto,
  UpdateResidentDto,
} from './resident.dto';
import { ResidentsService } from './residents.service';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
import { ResidentPaginationQueryDto } from '../common/pagination.dto';
import { assertNonEmptyPatch } from '../common/non-empty-patch.pipe';
import { ApiCreatedResponse, ApiOkResponse, ApiQuery } from '@nestjs/swagger';

@Controller('residents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedResidentsResponseDto })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    enum: ['true', 'false'],
  })
  list(@Query() query: ResidentPaginationQueryDto) {
    return this.residentsService.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ResidentResponseDto })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    enum: ['true', 'false'],
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ResidentPaginationQueryDto,
  ) {
    return this.residentsService.findOne(id, query.includeArchived);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED) // Código HTTP 201
  @ApiCreatedResponse({ type: ResidentResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateResidentDto) {
    return this.residentsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ResidentResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResidentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.residentsService.update(id, assertNonEmptyPatch(dto), user);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ResidentResponseDto })
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.residentsService.archive(id, user);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ResidentResponseDto })
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.residentsService.restore(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // Código HTTP 204
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.residentsService.remove(id, user);
  }
}
