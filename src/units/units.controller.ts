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
  CreateUnitDto,
  PaginatedUnitsResponseDto,
  UnitResponseDto,
  UpdateUnitDto,
} from './unit.dto';
import { UnitsService } from './units.service';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
import { ActivePaginationQueryDto } from '../common/pagination.dto';
import { NonEmptyPatchPipe } from '../common/non-empty-patch.pipe';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';

@Controller('units')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedUnitsResponseDto })
  list(@Query() query: ActivePaginationQueryDto) {
    return this.unitsService.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: UnitResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.unitsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: UnitResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto, user);
  }

  @Patch(':id')
  @UsePipes(NonEmptyPatchPipe)
  @ApiOkResponse({ type: UnitResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUnitDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.unitsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.unitsService.remove(id, user);
  }
}
