import { randomUUID } from 'node:crypto';
import { INestApplication, Type } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Role } from '../src/common/role.enum';
import { configureHttpApp } from '../src/common/http/configure-http-app';
import { startDisposablePostgres } from './support/disposable-postgres';

type Database = Awaited<ReturnType<typeof startDisposablePostgres>>['options'];
const adminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const guardId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const inactiveGuardId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const residentId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

describe('Guard gate authorization HTTP contract', () => {
  let app: INestApplication;
  let httpServer: never;
  let postgres: Awaited<ReturnType<typeof startDisposablePostgres>>;
  let dataSource: DataSource;
  let adminToken: string;
  let guardToken: string;
  let inactiveGuardToken: string;

  beforeAll(async () => {
    postgres = await startDisposablePostgres('guard-gate-proof');
    const database = postgres.options;
    Object.assign(process.env, {
      NODE_ENV: 'development',
      DATABASE_HOST: database.host,
      DATABASE_PORT: String(database.port),
      DATABASE_USER: database.username,
      DATABASE_PASSWORD: database.password,
      DATABASE_NAME: database.database,
      JWT_SECRET: 'guard-gate-e2e-secret-with-more-than-32-characters',
      PASS_SECRET_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString('base64'),
      SESSION_DIGEST_ACTIVE_VERSION: 'digest-v1',
      SESSION_DIGEST_KEYRING: JSON.stringify({
        'digest-v1': Buffer.alloc(32, 1).toString('base64'),
      }),
      SESSION_DERIVATION_ACTIVE_VERSION: 'derive-v1',
      SESSION_DERIVATION_KEYRING: JSON.stringify({
        'derive-v1': Buffer.alloc(32, 2).toString('base64'),
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dataSourceModule = require('../src/config/typeorm.datasource') as {
      default: { options: DataSourceOptions };
    };
    const options = dataSourceModule.default.options;
    dataSource = new DataSource({ ...options, ...databaseOptions(database) });
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.query(
      `INSERT INTO users (id, email, password_hash, role, active) VALUES
       ($1, 'admin@example.test', 'not-a-login-secret', 'ADMIN', true),
       ($2, 'guard@example.test', 'not-a-login-secret', 'GUARD', true),
       ($3, 'inactive-guard@example.test', 'not-a-login-secret', 'GUARD', false),
       ($4, 'resident@example.test', 'not-a-login-secret', 'RESIDENT', true)`,
      [adminId, guardId, inactiveGuardId, residentId],
    );

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppModule } = require('../src/app.module') as { AppModule: Type };
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureHttpApp(app);
    await app.init();
    httpServer = app.getHttpServer() as never;
    const jwt = app.get(JwtService);
    adminToken = await jwt.signAsync({ sub: adminId, role: Role.ADMIN });
    guardToken = await jwt.signAsync({ sub: guardId, role: Role.GUARD });
    inactiveGuardToken = await jwt.signAsync({
      sub: inactiveGuardId,
      role: Role.GUARD,
    });
  }, 120_000);

  afterAll(async () => {
    const errors: unknown[] = [];
    for (const cleanup of [
      () => app?.close(),
      () => (dataSource?.isInitialized ? dataSource.destroy() : undefined),
      () => postgres?.stop(),
    ]) {
      try {
        await cleanup();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) {
      throw new AggregateError(errors, 'Guard E2E cleanup failed');
    }
  });

  it('defaults old and new GUARD rows to deny and grants/revokes against old tokens', async () => {
    const initial = await queryRows<Array<{ guard_gate_authorized: boolean }>>(
      dataSource,
      'SELECT guard_gate_authorized FROM users WHERE id = $1',
      [guardId],
    );
    expect(initial[0].guard_gate_authorized).toBe(false);

    const scan = () =>
      request(httpServer)
        .post('/api/access/validate')
        .set('Authorization', `Bearer ${guardToken}`)
        .send({
          qrPayload: JSON.stringify({
            v: 1,
            passId: randomUUID(),
            token: '123456',
          }),
          clientEventId: randomUUID(),
          direction: 'ENTRY',
        });
    await scan().expect(403);
    await admin()
      .patch(`/api/access/guards/${guardId}/gate-authorization`)
      .send({ authorized: true })
      .expect(200, { id: guardId, authorized: true });
    const allowedScan = (await scan().expect(200)).body as {
      decision: string;
      reason: string;
    };
    expect(allowedScan).toMatchObject({
      decision: 'DENIED',
      reason: 'PASS_NOT_FOUND',
    });

    const audit = await queryRows<Array<Record<string, unknown>>>(
      dataSource,
      `SELECT action, resource_type, resource_id, metadata
       FROM audit_logs WHERE resource_id = $1 ORDER BY created_at`,
      [guardId],
    );
    expect(audit).toEqual([
      expect.objectContaining({
        action: 'GUARD_GATE_AUTHORIZATION_GRANTED',
        resource_type: 'USER',
        resource_id: guardId,
        metadata: { from: false, to: true },
      }),
    ]);

    await admin()
      .patch(`/api/access/guards/${guardId}/gate-authorization`)
      .send({ authorized: true })
      .expect(200);
    expect(
      await dataSource.query(
        'SELECT count(*) FROM audit_logs WHERE resource_id = $1',
        [guardId],
      ),
    ).toEqual([{ count: '1' }]);
    await admin()
      .patch(`/api/access/guards/${guardId}/gate-authorization`)
      .send({ authorized: false })
      .expect(200, { id: guardId, authorized: false });
    await scan().expect(403);
    expect(
      await dataSource.query(
        'SELECT action, metadata FROM audit_logs WHERE resource_id = $1 ORDER BY created_at',
        [guardId],
      ),
    ).toEqual([
      {
        action: 'GUARD_GATE_AUTHORIZATION_GRANTED',
        metadata: { from: false, to: true },
      },
      {
        action: 'GUARD_GATE_AUTHORIZATION_REVOKED',
        metadata: { from: true, to: false },
      },
    ]);
  });

  it('restricts grant management to ADMIN and validates targets and account state', async () => {
    const residentToken = await app.get(JwtService).signAsync({
      sub: residentId,
      role: Role.RESIDENT,
    });
    await request(httpServer)
      .patch(`/api/access/guards/${guardId}/gate-authorization`)
      .set('Authorization', `Bearer ${guardToken}`)
      .send({ authorized: true })
      .expect(403);
    await request(httpServer)
      .patch(`/api/access/guards/${residentId}/gate-authorization`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ authorized: true })
      .expect(404);
    await request(httpServer)
      .patch(`/api/access/guards/${randomUUID()}/gate-authorization`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ authorized: true })
      .expect(404);
    await request(httpServer)
      .patch(`/api/access/guards/${inactiveGuardId}/gate-authorization`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ authorized: true })
      .expect(400);
    await request(httpServer)
      .patch(`/api/access/guards/${inactiveGuardId}/gate-authorization`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ authorized: false })
      .expect(200);
    await request(httpServer)
      .post('/api/access/validate')
      .set('Authorization', `Bearer ${inactiveGuardToken}`)
      .send({
        qrPayload: '{}',
        clientEventId: randomUUID(),
        direction: 'ENTRY',
      })
      .expect(401);
    await request(httpServer)
      .patch(`/api/access/guards/${guardId}/gate-authorization`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ authorized: false })
      .expect(403);
  });

  it('rolls back the grant if its audit insert fails', async () => {
    const auditsBefore = await queryRows<Array<{ count: string }>>(
      dataSource,
      'SELECT count(*) FROM audit_logs WHERE resource_id = $1',
      [guardId],
    );
    await dataSource.query(`
      CREATE FUNCTION reject_guard_grant_audit() RETURNS trigger AS $$
      BEGIN
        IF NEW.action = 'GUARD_GATE_AUTHORIZATION_GRANTED' THEN
          RAISE EXCEPTION 'audit insert rejected';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await dataSource.query(`
      CREATE TRIGGER reject_guard_grant_audit_trigger
      BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_guard_grant_audit()
    `);
    try {
      await admin()
        .patch(`/api/access/guards/${guardId}/gate-authorization`)
        .send({ authorized: true })
        .expect(500);
      const state = await queryRows<Array<{ guard_gate_authorized: boolean }>>(
        dataSource,
        'SELECT guard_gate_authorized FROM users WHERE id = $1',
        [guardId],
      );
      expect(state[0].guard_gate_authorized).toBe(false);
      expect(
        await dataSource.query(
          'SELECT count(*) FROM audit_logs WHERE resource_id = $1',
          [guardId],
        ),
      ).toEqual(auditsBefore);
    } finally {
      await dataSource.query(
        'DROP TRIGGER reject_guard_grant_audit_trigger ON audit_logs',
      );
      await dataSource.query('DROP FUNCTION reject_guard_grant_audit()');
    }
  });

  function admin() {
    return {
      patch: (path: string) =>
        request(httpServer)
          .patch(path)
          .set('Authorization', `Bearer ${adminToken}`),
    };
  }
});

async function queryRows<T>(
  dataSource: DataSource,
  sql: string,
  parameters: unknown[],
): Promise<T> {
  const result: unknown = await dataSource.query(sql, parameters);
  return result as T;
}

function databaseOptions(database: Database) {
  return {
    host: database.host,
    port: database.port,
    username: database.username,
    password: database.password,
    database: database.database,
  };
}
