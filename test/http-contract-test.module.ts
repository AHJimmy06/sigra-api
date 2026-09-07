import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Module,
  Post,
  UnauthorizedException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { IsEmail, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ContactDto {
  @IsEmail()
  email!: string;
}

class ContractDto {
  @IsString()
  name!: string;

  @ValidateNested()
  @Type(() => ContactDto)
  contact!: ContactDto;
}

@Controller('contract')
class HttpContractController {
  @Get('success')
  success() {
    return { ok: true, items: ['unchanged'] };
  }

  @Post('validation')
  validation(@Body() body: ContractDto) {
    return body;
  }

  @Get('bad-request')
  badRequest() {
    throw new BadRequestException('untrusted body content');
  }

  @Get('missing-auth')
  missingAuth() {
    throw new UnauthorizedException('Bearer token required');
  }

  @Get('forbidden')
  forbidden() {
    throw new ForbiddenException('Insufficient role');
  }

  @Delete('unit')
  conflict() {
    throw new ConflictException(
      'Unit cannot be deleted while residents are linked to it',
    );
  }

  @Get('failure')
  failure() {
    throw new InternalServerErrorException(
      'SQL SELECT token=secret header=leak body=leak',
    );
  }
}

@Controller('rate-limit')
@UseGuards(ThrottlerGuard)
class RateLimitController {
  @Get()
  @Throttle({ default: { limit: 1, ttl: 60_000 } })
  get() {
    return { ok: true };
  }
}

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
  controllers: [HttpContractController, RateLimitController],
  providers: [ThrottlerGuard],
})
export class HttpContractTestModule {}
