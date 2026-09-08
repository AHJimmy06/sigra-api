import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { Role } from '../common/role.enum';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import {
  AccessEventQueryDto,
  AccessPassResponseDto,
  CreatePassDto,
  CurrentQrResponseDto,
  PaginatedAccessEventsResponseDto,
  ValidateAccessDto,
  ValidateAccessResponseDto,
} from './access.dto';
import { AccessService } from './access.service';
import { getRequestId } from '../common/http/request-id.middleware';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('access')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccessController {
  constructor(private readonly access: AccessService) {}
  @Get('events')
  @Roles(Role.ADMIN)
  @ApiOkResponse({ type: PaginatedAccessEventsResponseDto })
  listEvents(@Query() query: AccessEventQueryDto) {
    return this.access.listEvents(query);
  }
  @Get('passes')
  @Roles(Role.RESIDENT)
  @ApiOkResponse({ type: [AccessPassResponseDto] })
  list(@CurrentUser() user: AuthUser) {
    return this.access.listPasses(user.residentId!);
  }
  @Post('passes')
  @Roles(Role.RESIDENT)
  @ApiCreatedResponse({ type: AccessPassResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePassDto) {
    return this.access.createPass(user.residentId!, dto.validDays);
  }
  @Post('passes/:id/revoke') @Roles(Role.RESIDENT) revoke(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.access.revoke(user.residentId!, id);
  }
  @Get('passes/:id/qr')
  @Roles(Role.RESIDENT)
  @ApiOkResponse({ type: CurrentQrResponseDto })
  qr(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.access.currentQr(user.residentId!, id);
  }
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.GUARD)
  @UseGuards(ThrottlerGuard)
  @ApiOkResponse({ type: ValidateAccessResponseDto })
  validate(
    @CurrentUser() user: AuthUser,
    @Body() dto: ValidateAccessDto,
    @Req() request: Request,
  ) {
    return this.access.validate(
      dto.qrPayload,
      dto.clientEventId,
      dto.direction,
      user,
      getRequestId(request),
      request.ip,
    );
  }
}
