import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Role } from '../common/role.enum';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreatePassDto, ValidateAccessDto } from './access.dto';
import { AccessService } from './access.service';

@Controller('access')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccessController {
  constructor(private readonly access: AccessService) {}
  @Get('passes') @Roles(Role.RESIDENT) list(@CurrentUser() user: AuthUser) {
    return this.access.listPasses(user.residentId!);
  }
  @Post('passes') @Roles(Role.RESIDENT) create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePassDto,
  ) {
    return this.access.createPass(user.residentId!, dto.validDays);
  }
  @Post('passes/:id/revoke') @Roles(Role.RESIDENT) revoke(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.access.revoke(user.residentId!, id);
  }
  @Get('passes/:id/qr') @Roles(Role.RESIDENT) qr(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.access.currentQr(user.residentId!, id);
  }
  @Get('passes/:id/provision')
  @Roles(Role.RESIDENT)
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  provision(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.access.provision(user.residentId!, id);
  }
  @Post('validate') @Roles(Role.GUARD) validate(
    @CurrentUser() user: AuthUser,
    @Body() dto: ValidateAccessDto,
  ) {
    return this.access.validate(
      dto.qrPayload,
      dto.clientEventId,
      dto.direction,
      user.sub,
    );
  }
}
