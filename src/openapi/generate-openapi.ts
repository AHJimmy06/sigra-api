import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { AccessController } from '../access/access.controller';
import { AccessService } from '../access/access.service';
import { AnnouncementsController } from '../announcements/announcements.controller';
import { AnnouncementsService } from '../announcements/announcements.service';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';
import { AuthController } from '../auth/auth.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthService } from '../auth/auth.service';
import { RolesGuard } from '../common/roles.guard';
import { DashboardController } from '../dashboard/dashboard.controller';
import { DashboardService } from '../dashboard/dashboard.service';
import { ResidentsController } from '../residents/residents.controller';
import { ResidentsService } from '../residents/residents.service';
import { TicketImageStorage } from '../tickets/ticket-image.storage';
import { TicketsController } from '../tickets/tickets.controller';
import { TicketsService } from '../tickets/tickets.service';
import { UnitsController } from '../units/units.controller';
import { UnitsService } from '../units/units.service';
import { User } from '../users/user.entity';
import { createOpenApiDocument } from './openapi';

const serviceTokens = [
  AccessService,
  AnnouncementsService,
  AppService,
  AuthService,
  DashboardService,
  ResidentsService,
  TicketImageStorage,
  TicketsService,
  UnitsService,
];

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }])],
  controllers: [
    AccessController,
    AnnouncementsController,
    AppController,
    AuthController,
    DashboardController,
    ResidentsController,
    TicketsController,
    UnitsController,
  ],
  providers: [
    ...serviceTokens.map((provide) => ({ provide, useValue: {} })),
    ...[JwtAuthGuard, RolesGuard, ThrottlerGuard].map((provide) => ({
      provide,
      useValue: { canActivate: () => true },
    })),
    { provide: JwtService, useValue: {} },
    { provide: getRepositoryToken(User), useValue: {} },
  ],
})
class OpenApiModule {}

async function generate() {
  const app = await NestFactory.create(OpenApiModule, {
    logger: false,
    abortOnError: false,
  });
  app.setGlobalPrefix('api');
  const document = createOpenApiDocument(app);
  const outputPath = process.env.OPENAPI_OUTPUT_PATH
    ? resolve(process.env.OPENAPI_OUTPUT_PATH)
    : resolve(process.cwd(), 'docs', 'openapi', 'v1.json');
  const directory = dirname(outputPath);
  await mkdir(directory, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  await app.close();
}

void generate().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
