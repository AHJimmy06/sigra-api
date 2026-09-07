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
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'e2e-secret-with-more-than-32-characters',
        }),
      ],
      controllers: [ProtectedController],
      providers: [
        JwtAuthGuard,
        RolesGuard,
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
                  : {
                      id,
                      email: 'admin@example.com',
                      role: Role.ADMIN,
                      residentId: null,
                    },
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
  afterAll(() => app.close());
});
