import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../common/roles.guard';
import { User } from '../users/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthSession } from './auth-session.entity';
import { DerivationKeyring } from './session-foundation/derivation-keyring';
import {
  DigestKeyring,
  KeyringConfiguration,
} from './session-foundation/digest-keyring';
import { SessionKeyReadiness } from './session-foundation/session-key-readiness';
import { RefreshOperation } from './refresh-operation.entity';
import { SessionCleanup } from './session-foundation/cleanup';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuthSession, RefreshOperation]),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('JWT_SECRET') ??
          'test-secret-only-not-for-production',
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: DigestKeyring,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        DigestKeyring.create(
          config.getOrThrow<KeyringConfiguration>('SESSION_DIGEST_KEYRING'),
        ),
    },
    {
      provide: DerivationKeyring,
      inject: [ConfigService, DigestKeyring],
      useFactory: (config: ConfigService, digestKeyring: DigestKeyring) =>
        DerivationKeyring.create({
          ...config.getOrThrow<KeyringConfiguration>(
            'SESSION_DERIVATION_KEYRING',
          ),
          forbiddenKeyring: digestKeyring,
        }),
    },
    SessionKeyReadiness,
    SessionCleanup,
  ],
  exports: [
    JwtAuthGuard,
    RolesGuard,
    JwtModule,
    TypeOrmModule,
    DigestKeyring,
    DerivationKeyring,
    SessionCleanup,
  ],
})
export class AuthModule {}
