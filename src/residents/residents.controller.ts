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
import { CreateResidentDto, UpdateResidentDto } from './resident.dto';
import { ResidentsService } from './residents.service';

@Controller('residents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('unitId') unitId?: string,
  ) {
    return this.residentsService.list({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 10,
      search,
      status,
      unitId,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED) // Código HTTP 201
  create(@Body() dto: CreateResidentDto) {
    return this.residentsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResidentDto,
  ) {
    return this.residentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // Código HTTP 204
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.residentsService.remove(id);
  }
}