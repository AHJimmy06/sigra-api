import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from './auth.types';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './login.dto';
import { LoginResponseDto } from './login-response.dto';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  login(
    @Body() dto: LoginDto,
    @Req() request: Request,
  ): Promise<LoginResponseDto> {
    return this.auth.login(dto, request.ip);
  }
  @Get('me') @UseGuards(JwtAuthGuard) me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
