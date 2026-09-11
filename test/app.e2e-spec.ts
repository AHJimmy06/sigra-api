import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { Role } from '../src/common/role.enum';
import { Roles } from '../src/common/roles.decorator';
import { RolesGuard } from '../src/common/roles.guard';
import { User } from '../src/users/user.entity';
import { configureHttpApp } from '../src/common/http/configure-http-app';
import { AccessController } from '../src/access/access.controller';
import { AccessService } from '../src/access/access.service';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  AccessDecision,
  AccessDirection,
} from '../src/access/access-event.entity';

@Controller('protected')
@UseGuards(JwtAuthGuard, RolesGuard)
class ProtectedController {
  @Get('admin') @Roles(Role.ADMIN) admin() {
    return { ok: true };
  }
}

describe('JWT authentication and role enforcement (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  const access = {
    listEvents: jest.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      pageSize: 25,
    }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'e2e-secret-with-more-than-32-characters',
        }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
      ],
      controllers: [ProtectedController, AccessController],
      providers: [
        JwtAuthGuard,
        RolesGuard,
        { provide: AccessService, useValue: access },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOneBy: ({ id }: { id: string }) =>
              Promise.resolve(
                id === 'guard-1'
                  ? {
                      id,
                      email: 'guard@example.com',
                      role: Role.GUARD,
                      residentId: null,
                    }
                  : id === 'admin-1'
                    ? {
                        id,
                        email: 'admin@example.com',
                        role: Role.ADMIN,
                        residentId: null,
                      }
                    : null,
              ),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    configureHttpApp(app);
    jwt = module.get(JwtService);
    await app.init();
  });
  it('rejects missing bearer authentication', () =>
    request(app.getHttpServer()).get('/api/protected/admin').expect(401));
  it('rejects an unknown bearer subject without exposing the credential', async () => {
    const token = await jwt.signAsync({
      sub: 'missing-user',
      email: 'missing@example.com',
      role: Role.ADMIN,
      residentId: null,
    });

    const response = await request(app.getHttpServer())
      .get('/api/protected/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(JSON.stringify(response.body)).not.toContain(token);
  });
  it('preserves case-sensitive Bearer authentication', () =>
    request(app.getHttpServer())
      .get('/api/protected/admin')
      .set('Authorization', 'bearer malformed-token')
      .expect(401));
  it('rejects a valid token with the wrong role', async () => {
    const token = await jwt.signAsync({
      sub: 'guard-1',
      email: 'guard@example.com',
      role: Role.GUARD,
      residentId: null,
    });
    return request(app.getHttpServer())
      .get('/api/protected/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
  it('normalizes an expired signed token as unauthorized', async () => {
    const token = await jwt.signAsync(
      {
        sub: 'admin-1',
        email: 'admin@example.com',
        role: Role.ADMIN,
        residentId: null,
      },
      { expiresIn: -1 },
    );
    const response = await request(app.getHttpServer())
      .get('/api/protected/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
      details: {},
      requestId: response.headers['x-request-id'],
    });
  });
  it('allows the required role', async () => {
    const token = await jwt.signAsync({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: Role.ADMIN,
      residentId: null,
    });
    return request(app.getHttpServer())
      .get('/api/protected/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, { ok: true });
  });
  it('restricts access history to ADMIN and validates its query contract', async () => {
    const guardToken = await jwt.signAsync({
      sub: 'guard-1',
      email: 'guard@example.com',
      role: Role.GUARD,
      residentId: null,
    });
    await request(app.getHttpServer())
      .get('/api/access/events')
      .set('Authorization', `Bearer ${guardToken}`)
      .expect(403);

    const adminToken = await jwt.signAsync({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: Role.ADMIN,
      residentId: null,
    });
    await request(app.getHttpServer())
      .get('/api/access/events?decision=UNKNOWN')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    await request(app.getHttpServer())
      .get(
        '/api/access/events?from=2026-09-01&to=2026-09-07&decision=DENIED&direction=EXIT&page=2&pageSize=25',
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, { items: [], total: 0, page: 2, pageSize: 25 });
    expect(access.listEvents).toHaveBeenCalledWith({
      from: '2026-09-01',
      to: '2026-09-07',
      decision: AccessDecision.DENIED,
      direction: AccessDirection.EXIT,
      page: 2,
      pageSize: 25,
    });
  });
  afterAll(() => app.close());
});
