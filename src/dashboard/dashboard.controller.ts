import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '../common/role.enum';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { DashboardService } from './dashboard.service';
import { ApiOkResponse } from '@nestjs/swagger';
import { DashboardMetricsResponseDto } from './dashboard.dto';
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Get('metrics')
  @ApiOkResponse({ type: DashboardMetricsResponseDto })
  metrics() {
    return this.dashboard.metrics();
  }
}
