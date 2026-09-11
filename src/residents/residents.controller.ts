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
  UsePipes,
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
  ResidentUpdateResponseDto,
  UpdateResidentDto,
} from './resident.dto';
import { ResidentsService } from './residents.service';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
import { ResidentPaginationQueryDto } from '../common/pagination.dto';
import { NonEmptyPatchPipe } from '../common/non-empty-patch.pipe';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';

@Controller('residents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedResidentsResponseDto })
  list(@Query() query: ResidentPaginationQueryDto) {
    return this.residentsService.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ResidentResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.residentsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED) // Código HTTP 201
  @ApiCreatedResponse({ type: ResidentResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateResidentDto) {
    return this.residentsService.create(dto, user);
  }

  @Patch(':id')
  @UsePipes(NonEmptyPatchPipe)
  @ApiOkResponse({ type: ResidentUpdateResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResidentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.residentsService.update(id, dto, user);
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
