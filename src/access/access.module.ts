import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Resident } from '../residents/resident.entity';
import { User } from '../users/user.entity';
import { AccessController } from './access.controller';
import { AccessEvent } from './access-event.entity';
import { AccessPass } from './access-pass.entity';
import { AccessService } from './access.service';
import { SecretCryptoService } from './secret-crypto.service';
import { GuardGateAuthorizationGuard } from './guard-gate-authorization.guard';
import { GuardAuthorizationService } from './guard-authorization.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccessPass, AccessEvent, Resident, User]),
    AuthModule,
  ],
  controllers: [AccessController],
  providers: [
    AccessService,
    SecretCryptoService,
    GuardGateAuthorizationGuard,
    GuardAuthorizationService,
  ],
  exports: [AccessService],
})
export class AccessModule {}
