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
} from '@nestjs/common';
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

@Module({ controllers: [HttpContractController] })
export class HttpContractTestModule {}
