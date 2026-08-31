import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Resident } from '../residents/resident.entity';
import { AccessController } from './access.controller';
import { AccessEvent } from './access-event.entity';
import { AccessPass } from './access-pass.entity';
import { AccessService } from './access.service';
import { SecretCryptoService } from './secret-crypto.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccessPass, AccessEvent, Resident]),
    AuthModule,
  ],
  controllers: [AccessController],
  providers: [AccessService, SecretCryptoService],
  exports: [AccessService],
})
export class AccessModule {}
