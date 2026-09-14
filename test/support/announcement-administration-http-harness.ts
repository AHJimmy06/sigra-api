/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion */
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, QueryRunner } from 'typeorm';
import { Role } from '../../src/common/role.enum';
import { configureHttpApp } from '../../src/common/http/configure-http-app';
import { startDisposablePostgres } from './disposable-postgres';

type UserSeed = {
  id: string;
  email: string;
  role: Role;
  displayName: string | null;
};
type AnnouncementSeed = {
  title: string;
  body: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
};

type Client =
  ReturnType<typeof request> extends never
    ? never
    : {
        get(path: string): request.Test;
        post(path: string): request.Test;
        patch(path: string): request.Test;
      };

export type AnnouncementAdministrationHttpHarness = {
  app: INestApplication;
  dataSource: DataSource;
  adminId: string;
  adminToken: string;
  authorized(token?: string): Client;
  anonymous(): Client;
  tokenFor(user: UserSeed): Promise<string>;
  seedUser(
    email: string,
    role: Role,
    displayName?: string | null,
  ): Promise<UserSeed>;
  seedAnnouncement(seed: AnnouncementSeed): Promise<{ id: string }>;
  announcementState(id: string): Promise<Record<string, unknown> | undefined>;
  announcementCount(): Promise<number>;
  auditRows(resourceId: string): Promise<Array<Record<string, unknown>>>;
  auditCount(action: string, resourceId: string): Promise<number>;
  persistenceSnapshot(id: string): Promise<Record<string, unknown>>;
  holdAnnouncementLock(id: string): Promise<{
    waitForBlocked(count?: number): Promise<void>;
    release(): Promise<void>;
  }>;
  installAuditFailure(action: string): Promise<{ remove(): Promise<void> }>;
  close(): Promise<void>;
};

export async function startAnnouncementAdministrationHttpHarness(
  prefix: string,
): Promise<AnnouncementAdministrationHttpHarness> {
  const postgres = await startDisposablePostgres(prefix);
  let app: INestApplication | undefined;
  let dataSource: DataSource | undefined;
  const locks: QueryRunner[] = [];
  const cleanup: Array<() => Promise<void>> = [];
  const adminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  try {
    Object.assign(process.env, {
      NODE_ENV: 'development',
      DATABASE_HOST: '127.0.0.1',
      DATABASE_PORT: String(postgres.options.port),
      DATABASE_USER: postgres.options.username,
      DATABASE_PASSWORD: postgres.options.password,
      DATABASE_NAME: postgres.options.database,
      JWT_SECRET: 'announcement-e2e-secret-with-more-than-32-characters',
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
    const sourceOptions = require('../../src/config/typeorm.datasource').default
      .options;
    const migrationSource = new DataSource({
      ...sourceOptions,
      host: '127.0.0.1',
      port: postgres.options.port,
      username: postgres.options.username,
      password: postgres.options.password,
      database: postgres.options.database,
    });
    await migrationSource.initialize();
    await migrationSource.runMigrations();
    await migrationSource.destroy();
    const { AppModule } = require('../../src/app.module');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureHttpApp(app);
    await app.init();
    dataSource = app.get(DataSource);
    const jwt = app.get(JwtService);

    const seedUser = async (
      email: string,
      role: Role,
      displayName: string | null = null,
    ): Promise<UserSeed> => {
      const id = email === 'admin@example.test' ? adminId : randomUUID();
      await dataSource!.query(
        "INSERT INTO users (id, email, password_hash, role, active, display_name) VALUES ($1, $2, 'x', $3, true, $4)",
        [id, email, role, displayName],
      );
      return { id, email, role, displayName };
    };
    const admin = await seedUser('admin@example.test', Role.ADMIN, 'Admin');
    const adminToken = await jwt.signAsync({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      residentId: null,
    });
    const tokenFor = (user: UserSeed) =>
      jwt.signAsync({
        sub: user.id,
        email: user.email,
        role: user.role,
        residentId: null,
      });
    const client = (token?: string): Client => {
      const server = request(app!.getHttpServer());
      const withToken =
        (method: 'get' | 'post' | 'patch') => (path: string) => {
          const call = server[method](path);
          return token ? call.set('Authorization', `Bearer ${token}`) : call;
        };
      return {
        get: withToken('get'),
        post: withToken('post'),
        patch: withToken('patch'),
      };
    };
    const auditRows = async (resourceId: string) =>
      dataSource!.query(
        'SELECT action, actor_user_id AS "actorUserId", actor_role AS "actorRole", resource_type AS "resourceType", resource_id AS "resourceId", metadata FROM audit_logs WHERE resource_id = $1 ORDER BY created_at, ctid',
        [resourceId],
      ) as Promise<Array<Record<string, unknown>>>;
    const announcementState = async (id: string) =>
      (
        (await dataSource!.query(
          'SELECT id, title, body, status, published_at AS "publishedAt", updated_at AS "updatedAt", author_id_snapshot AS "authorIdSnapshot", author_display_name_snapshot AS "authorDisplayNameSnapshot", author_email_snapshot AS "authorEmailSnapshot" FROM announcements WHERE id = $1',
          [id],
        )) as Array<Record<string, unknown>>
      )[0];
    const auditCount = async (action: string, resourceId: string) =>
      Number(
        (
          (await dataSource!.query(
            'SELECT count(*) AS count FROM audit_logs WHERE action = $1 AND resource_id = $2',
            [action, resourceId],
          )) as Array<{ count: string }>
        )[0].count,
      );
    const api: AnnouncementAdministrationHttpHarness = {
      app,
      dataSource,
      adminId,
      adminToken,
      authorized: (token = adminToken) => client(token),
      anonymous: () => client(),
      tokenFor,
      seedUser,
      async seedAnnouncement({ title, body, status = 'DRAFT' }) {
        const id = randomUUID();
        const publishedAt = status === 'DRAFT' ? null : new Date();
        const [{ id: authorId, display_name: displayName, email }] =
          await dataSource!.query(
            "SELECT id, display_name, email FROM users WHERE role = 'ADMIN' AND active ORDER BY id LIMIT 1",
          );
        await dataSource!.query(
          'INSERT INTO announcements (id, title, body, status, published_at, author_user_id, author_id_snapshot, author_display_name_snapshot, author_email_snapshot) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8)',
          [id, title, body, status, publishedAt, authorId, displayName, email],
        );
        return { id };
      },
      announcementState,
      async announcementCount() {
        return Number(
          (
            await dataSource!.query(
              'SELECT count(*) AS count FROM announcements',
            )
          )[0].count,
        );
      },
      auditRows,
      auditCount,
      async persistenceSnapshot(id: string) {
        return {
          announcement: await announcementState(id),
          announcements: await api.announcementCount(),
          audits: await auditRows(id),
        };
      },
      async holdAnnouncementLock(id: string) {
        const runner = dataSource!.createQueryRunner();
        locks.push(runner);
        await runner.connect();
        await runner.startTransaction();
        await runner.manager.query(
          'SELECT id FROM announcements WHERE id = $1 FOR UPDATE',
          [id],
        );
        return {
          async waitForBlocked(count = 1) {
            for (let attempt = 0; attempt < 100; attempt += 1) {
              const [{ count: blocked }] = await dataSource!.query(
                'SELECT count(*)::int AS count FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0',
              );
              if (blocked >= count) return;
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
            throw new Error('Expected blocked PostgreSQL announcement writer');
          },
          async release() {
            if (runner.isTransactionActive) await runner.commitTransaction();
            if (!runner.isReleased) await runner.release();
          },
        };
      },
      async installAuditFailure(action: string) {
        const name = `fail_audit_${randomUUID().replace(/-/gu, '')}`;
        await dataSource!.query(
          `CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced audit rollback'; END $$`,
        );
        await dataSource!.query(
          `CREATE TRIGGER ${name} BEFORE INSERT ON audit_logs FOR EACH ROW WHEN (NEW.action = '${action}') EXECUTE FUNCTION ${name}()`,
        );
        let removed = false;
        const remove = async () => {
          if (removed) return;
          removed = true;
          await dataSource!.query(
            `DROP TRIGGER IF EXISTS ${name} ON audit_logs`,
          );
          await dataSource!.query(`DROP FUNCTION IF EXISTS ${name}()`);
        };
        cleanup.push(remove);
        return { remove };
      },
      async close() {
        const errors: unknown[] = [];
        for (const operation of [
          ...cleanup.map((remove) => async () => remove()),
          ...locks.map((runner) => async () => {
            if (runner.isTransactionActive) await runner.rollbackTransaction();
            if (!runner.isReleased) await runner.release();
          }),
          async () => app?.close(),
          async () => postgres.stop(),
        ]) {
          try {
            await operation();
          } catch (error) {
            errors.push(error);
          }
        }
        if (errors.length)
          throw new AggregateError(
            errors,
            'Announcement administration E2E cleanup failed',
          );
      },
    };
    return api;
  } catch (error) {
    const errors = [error];
    try {
      await app?.close();
    } catch (cleanupError) {
      errors.push(cleanupError);
    }
    try {
      await postgres.stop();
    } catch (cleanupError) {
      errors.push(cleanupError);
    }
    throw errors.length === 1
      ? error
      : new AggregateError(
          errors,
          'Announcement administration harness startup failed',
        );
  }
}
