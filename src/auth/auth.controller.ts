import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/current-user.decorator';
import type { AuthUser } from './auth.types';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './login.dto';
import { LoginResponseDto, LoginUserDto } from './login-response.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiOkResponse } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @ApiOkResponse({ type: LoginResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response?: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.auth.login(dto, request.ip);
    response?.setHeader('X-CSRF-Token', randomUUID());
    return result;
  }
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ type: LoginUserDto })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
