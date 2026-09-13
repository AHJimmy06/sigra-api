import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, QueryRunner } from 'typeorm';
import { Role } from '../src/common/role.enum';
import { HardenResidentIdentity1724600006000 } from '../src/migrations/1724600006000-HardenResidentIdentity';
import { HardenUnitIdentity1724600005000 } from '../src/migrations/1724600005000-HardenUnitIdentity';
import { configureHttpApp } from '../src/common/http/configure-http-app';
import { startDisposablePostgres } from './support/disposable-postgres';

const password = 'resident-e2e-password';
const actorId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const guardId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

type Database = Awaited<ReturnType<typeof startDisposablePostgres>>['options'];

// Keep database lifecycle ownership in the shared disposable PostgreSQL helper.
describe('Resident and unit administration against PostgreSQL', () => {
  let app: INestApplication;
  let postgres: Awaited<ReturnType<typeof startDisposablePostgres>>;
  let dataSource: DataSource;
  let adminToken: string;

  beforeAll(async () => {
    postgres = await startDisposablePostgres('resident-unit-proof');
    const database = postgres.options;
    Object.assign(process.env, {
      NODE_ENV: 'development',
      DATABASE_HOST: '127.0.0.1',
      DATABASE_PORT: String(database.port),
      DATABASE_USER: database.username,
      DATABASE_PASSWORD: database.password,
      DATABASE_NAME: database.database,
      JWT_SECRET: 'resident-unit-e2e-secret-with-more-than-32-characters',
      PASS_SECRET_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString('base64'),
      SESSION_DIGEST_ACTIVE_VERSION: 'digest-v1',
      SESSION_DIGEST_KEYRING: JSON.stringify({ 'digest-v1': Buffer.alloc(32, 1).toString('base64') }),
      SESSION_DERIVATION_ACTIVE_VERSION: 'derive-v1',
      SESSION_DERIVATION_KEYRING: JSON.stringify({ 'derive-v1': Buffer.alloc(32, 2).toString('base64') }),
    });
    const options = require('../src/config/typeorm.datasource').default.options;
    dataSource = new DataSource({ ...options, ...databaseOptions(database) });
    await dataSource.initialize();
    await dataSource.runMigrations();
    await provePhaseTwoMigrationRollback(dataSource);
    await seedUser(dataSource, actorId, 'admin@example.test', Role.ADMIN);
    await seedUser(dataSource, guardId, 'guard@example.test', Role.GUARD);

    const { AppModule } = require('../src/app.module');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureHttpApp(app);
    await app.init();
    adminToken = await app.get(JwtService).signAsync({
      sub: actorId, email: 'admin@example.test', role: Role.ADMIN, residentId: null,
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
      throw new AggregateError(errors, 'Resident E2E cleanup failed');
    }
  });

  it('returns real Phase 0 400, 401, 403, 404, and 409 errors without persistence', async () => {
    const unit = await createUnit('Error Unit');
    expect((await request(app.getHttpServer()).get('/api/units')).status).toBe(401);
    const guardToken = await app.get(JwtService).signAsync({
      sub: guardId, email: 'guard@example.test', role: Role.GUARD, residentId: null,
    });
    expect((await authorized(guardToken).get('/api/units')).status).toBe(403);
    expect((await authorized().patch(`/api/units/${unit.id}`).send({})).status).toBe(400);
    expect((await authorized().get(`/api/units/${randomUUID()}`)).status).toBe(404);
    expect((await createUnit(' error unit ')).status).toBe(409);
  });

  it('returns Phase 0 envelopes and preserves persistence for every resident error path', async () => {
    const unit = await createUnit('Resident Error Unit');
    const resident = await createResident(unit.id, 'resident-errors@example.test');
    const guardToken = await app.get(JwtService).signAsync({
      sub: guardId, email: 'guard@example.test', role: Role.GUARD, residentId: null,
    });
    await expectError(request(app.getHttpServer()).get(`/api/residents/${resident.id}`), 401, 'UNAUTHORIZED');
    await expectError(authorized(guardToken).get(`/api/residents/${resident.id}`), 403, 'FORBIDDEN');
    const before = await dataSource.query('SELECT name, active FROM residents WHERE id = $1', [resident.id]);
    await expectError(authorized().patch(`/api/residents/${resident.id}`).send({}), 400, 'VALIDATION_ERROR');
    expect(await dataSource.query('SELECT name, active FROM residents WHERE id = $1', [resident.id])).toEqual(before);
    await expectError(authorized().get(`/api/residents/${randomUUID()}`), 404, 'NOT_FOUND');
    await expectError(authorized().post('/api/residents').send({
      name: 'Collision', email: ' RESIDENT-ERRORS@EXAMPLE.TEST ', password, unitId: unit.id, phone: '1234567890',
    }), 409, 'CONFLICT');
    expect(await scalar('SELECT count(*) FROM users WHERE lower(btrim(email)) = $1', ['resident-errors@example.test'])).toBe('1');
  });

  it('reserves archived normalized resident email and unit code through real HTTP writes', async () => {
    const residentUnit = await createUnit('Reserved Resident Unit');
    const archivedResident = await createResident(residentUnit.id, 'reserved@example.test');
    const otherResident = await createResident(residentUnit.id, 'other@example.test');
    await authorized().post(`/api/residents/${archivedResident.id}/archive`).expect(200);
    await expectError(authorized().post('/api/residents').send({
      name: 'Reserved Create', email: ' RESERVED@EXAMPLE.TEST ', password, unitId: residentUnit.id, phone: '1234567890',
    }), 409, 'CONFLICT');
    await expectError(authorized().patch(`/api/residents/${otherResident.id}`).send({ email: 'reserved@example.test'}), 409, 'CONFLICT');

    const archivedUnit = await createUnit('Reserved Unit Code');
    const otherUnit = await createUnit('Other Unit Code');
    await authorized().post(`/api/units/${archivedUnit.id}/archive`).expect(200);
    await expectError(authorized().post('/api/units').send({
      code: 'RESERVED UNIT CODE', address: 'Proof Street 10', parkingSpaces: 1,
    }), 409, 'CONFLICT');
    await expectError(authorized().patch(`/api/units/${otherUnit.id}`).send({ code: 'reserved unit code' }), 409, 'CONFLICT');
  });

  it('lists archived residents only when requested and keeps tied resident pages stable', async () => {
    const unit = await createUnit('Resident Tie Unit');
    const first = await createResident(unit.id, 'resident-page-first@example.test');
    const second = await createResident(unit.id, 'resident-page-second@example.test');
    await dataSource.query('UPDATE residents SET created_at = $1 WHERE id = ANY($2)', [
      '2026-01-01T00:00:00.000Z', [first.id, second.id],
    ]);
    await authorized().post(`/api/residents/${first.id}/archive`).expect(200);
    const defaultList = await authorized().get('/api/residents?search=resident-page').expect(200);
    expect(defaultList.body.items.map((item: { id: string }) => item.id)).toEqual([second.id]);
    const archivedList = await authorized().get('/api/residents?search=resident-page&includeArchived=true&page=1&pageSize=1').expect(200);
    const secondPage = await authorized().get('/api/residents?search=resident-page&includeArchived=true&page=2&pageSize=1').expect(200);
    expect([archivedList.body.items[0].id, secondPage.body.items[0].id]).toEqual([first.id, second.id].sort().reverse());
  });

  it('persists restore audits, preserves inactive identities, and rolls back missing or failed resident restore', async () => {
    const unit = await createUnit('Restore Audit Unit');
    const resident = await createResident(unit.id, 'restore-audit@example.test');
    await authorized().post(`/api/residents/${resident.id}/archive`).expect(200);
    const beforeRestore = await auditCount('RESIDENT_RESTORED', resident.id);
    const restored = await authorized().post(`/api/residents/${resident.id}/restore`).expect(200);
    expect(restored.body).toMatchObject({ id: resident.id, active: false, archivedAt: null });
    expect(await auditCount('RESIDENT_RESTORED', resident.id)).toBe(beforeRestore + 1);
    expect(await dataSource.query('SELECT r.active AS resident_active, u.active AS user_active FROM residents r JOIN users u ON u.resident_id = r.id WHERE r.id = $1', [resident.id]))
      .toEqual([{ resident_active: false, user_active: false }]);

    await authorized().post(`/api/residents/${resident.id}/archive`).expect(200);
    await dataSource.query('DELETE FROM users WHERE resident_id = $1', [resident.id]);
    await expectError(authorized().post(`/api/residents/${resident.id}/restore`), 409, 'CONFLICT');
    expect(await scalar('SELECT count(*) FROM residents WHERE id = $1 AND archived_at IS NOT NULL', [resident.id])).toBe('1');

    const rollbackResident = await createResident(unit.id, 'restore-rollback@example.test');
    await authorized().post(`/api/residents/${rollbackResident.id}/archive`).expect(200);
    await assertAuditFailureRollsBack('residents', rollbackResident.id, 'RESIDENT_RESTORED', async () =>
      authorized().post(`/api/residents/${rollbackResident.id}/restore`),
    );
  });

  it('keeps repeated unit archive write-free and records each unit archive/restore transition once', async () => {
    const unit = await createUnit('Unit Audit Semantics');
    const archivesBefore = await auditCount('UNIT_ARCHIVED', unit.id);
    const restoresBefore = await auditCount('UNIT_RESTORED', unit.id);
    await authorized().post(`/api/units/${unit.id}/archive`).expect(200);
    const archivedState = await dataSource.query('SELECT active, archived_at, archived_by_user_id FROM units WHERE id = $1', [unit.id]);
    await authorized().post(`/api/units/${unit.id}/archive`).expect(200);
    expect(await dataSource.query('SELECT active, archived_at, archived_by_user_id FROM units WHERE id = $1', [unit.id])).toEqual(archivedState);
    expect(await auditCount('UNIT_ARCHIVED', unit.id)).toBe(archivesBefore + 1);
    await authorized().post(`/api/units/${unit.id}/restore`).expect(200);
    expect(await auditCount('UNIT_RESTORED', unit.id)).toBe(restoresBefore + 1);
    await authorized().post(`/api/units/${unit.id}/restore`).expect(200);
    expect(await auditCount('UNIT_RESTORED', unit.id)).toBe(restoresBefore + 1);
  });

  it('serializes normalized unit and resident collisions through PostgreSQL', async () => {
    const unitResponses = await Promise.all([
      createUnit('Race-Unit'), createUnit(' race-unit '),
    ]);
    expect(unitResponses.map((response) => response.status).sort()).toEqual([201, 409]);
    const unit = await createUnit('Resident Race Unit');
    const residentResponses = await Promise.all([
      createResident(unit.id, 'Race@Example.test'),
      createResident(unit.id, 'RACE@example.test'),
    ]);
    expect(residentResponses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await scalar('SELECT count(*) FROM users WHERE lower(btrim(email)) = $1', ['race@example.test'])).toBe('1');
  });

  it('keeps the active-unit invariant deterministic across assignment/reactivation and deactivation races', async () => {
    const target = await createUnit('Race Target');
    const source = await createUnit('Race Source');
    const inactive = await createResident(source.id, 'inactive@example.test');
    await authorized().patch(`/api/residents/${inactive.id}`).send({ active: false }).expect(200);
    await raceAgainstUnitDeactivation(target.id, () =>
      authorized().patch(`/api/residents/${inactive.id}`).send({ unitId: target.id, active: true }),
    );

    await authorized().patch(`/api/units/${target.id}`).send({ active: true }).expect(200);
    const assigned = await createResident(target.id, 'reactivate@example.test');
    await authorized().patch(`/api/residents/${assigned.id}`).send({ active: false }).expect(200);
    await raceAgainstUnitDeactivation(target.id, () =>
      authorized().patch(`/api/residents/${assigned.id}`).send({ active: true }),
    );
  });

  it('proves production-stack CRUD, visibility, stable pages, lifecycle no-ops, and audit rollback', async () => {
    const first = await createUnit('Page First');
    const second = await createUnit('Page Second');
    await dataSource.query('UPDATE units SET created_at = $1 WHERE id = ANY($2)', [
      '2026-01-01T00:00:00.000Z', [first.id, second.id],
    ]);
    const pageOne = await authorized().get('/api/units?search=page&page=1&pageSize=1').expect(200);
    const pageTwo = await authorized().get('/api/units?search=page&page=2&pageSize=1').expect(200);
    expect([pageOne.body.items[0].id, pageTwo.body.items[0].id]).toEqual([second.id, first.id].sort().reverse());

    const resident = await createResident(first.id, 'patch@example.test');
    const patched = await authorized().patch(`/api/residents/${resident.id}`)
      .send({ email: ' PATCHED@EXAMPLE.TEST ' });
    if (patched.status !== 200) throw new Error(JSON.stringify(patched.body));
    expect(patched.body).toMatchObject({ id: resident.id, email: 'patched@example.test', active: true });
    expect(JSON.stringify(patched.body)).not.toMatch(/password|role|archivedByUserId/i);

    const archivedUnit = await createUnit('Archive Unit');
    const beforeUnitNoop = await auditCount('UNIT_ARCHIVED', archivedUnit.id);
    await authorized().post(`/api/units/${archivedUnit.id}/archive`).expect(200);
    await authorized().get(`/api/units/${archivedUnit.id}`).expect(404);
    await authorized().get(`/api/units/${archivedUnit.id}?includeArchived=true`).expect(200);
    await authorized().post(`/api/units/${archivedUnit.id}/archive`).expect(200);
    expect(await auditCount('UNIT_ARCHIVED', archivedUnit.id)).toBe(beforeUnitNoop + 1);
    await authorized().post(`/api/units/${archivedUnit.id}/restore`).expect(200);

    const beforeResidentNoop = await auditCount('RESIDENT_ARCHIVED', resident.id);
    await authorized().post(`/api/residents/${resident.id}/archive`).expect(200);
    await authorized().get(`/api/residents/${resident.id}`).expect(404);
    await authorized().get(`/api/residents/${resident.id}?includeArchived=true`).expect(200);
    await authorized().post(`/api/residents/${resident.id}/archive`).expect(200);
    expect(await auditCount('RESIDENT_ARCHIVED', resident.id)).toBe(beforeResidentNoop + 1);
    const restored = await authorized().post(`/api/residents/${resident.id}/restore`).expect(200);
    expect(restored.body.active).toBe(false);
    await authorized().post(`/api/units/${first.id}/archive`).expect(409);

    await assertAuditFailureRollsBack('residents', resident.id, 'RESIDENT_ARCHIVED', async () =>
      authorized().post(`/api/residents/${resident.id}/archive`),
    );
    await assertAuditFailureRollsBack('units', archivedUnit.id, 'UNIT_ARCHIVED', async () =>
      authorized().post(`/api/units/${archivedUnit.id}/archive`),
    );
  });

  function authorized(token = adminToken) {
    const client = request(app.getHttpServer());
    const withToken = (method: 'get' | 'post' | 'patch') => (path: string) =>
      client[method](path).set('Authorization', `Bearer ${token}`);
    return { get: withToken('get'), post: withToken('post'), patch: withToken('patch') };
  }

  async function createUnit(code: string) {
    const response = await authorized().post('/api/units').send({ code, address: 'Proof Street 10', parkingSpaces: 1 });
    return { ...response.body, status: response.status };
  }

  async function createResident(unitId: string, email: string) {
    const response = await authorized().post('/api/residents').send({
      name: 'Proof Resident', email, password, unitId, phone: '1234567890',
    });
    return { ...response.body, status: response.status };
  }

  async function scalar(sql: string, parameters: unknown[] = []) {
    const [row] = await dataSource.query(sql, parameters) as Array<Record<string, string>>;
    return Object.values(row)[0];
  }

  async function expectError(response: Promise<request.Response>, status: number, code: string) {
    const result = await response;
    expect(result.status).toBe(status);
    expect(result.body).toMatchObject({ code, details: {} });
    expect(result.body.requestId).toEqual(expect.any(String));
  }

  async function auditCount(action: string, resourceId: string) {
    return Number(await scalar('SELECT count(*) FROM audit_logs WHERE action = $1 AND resource_id = $2', [action, resourceId]));
  }

  async function raceAgainstUnitDeactivation(unitId: string, residentRequest: () => Promise<request.Response>) {
    const lock = dataSource.createQueryRunner();
    await lock.connect();
    await lock.startTransaction();
    await lock.manager.query('SELECT id FROM units WHERE id = $1 FOR UPDATE', [unitId]);
    const residentChange = residentRequest();
    const deactivate = authorized().patch(`/api/units/${unitId}`).send({ active: false });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await lock.commitTransaction();
    await lock.release();
    const outcomes = await Promise.all([residentChange, deactivate]);
    expect(outcomes.map((outcome) => outcome.status).sort()).toEqual([200, 409]);
    expect(await scalar(`SELECT count(*) FROM residents r JOIN units u ON u.id = r.unit_id WHERE r.unit_id = $1 AND r.active AND NOT u.active`, [unitId])).toBe('0');
  }

  async function assertAuditFailureRollsBack(
    table: 'residents' | 'units', id: string, action: string, call: () => Promise<request.Response>,
  ) {
    const before = await dataSource.query(`SELECT active, archived_at FROM ${table} WHERE id = $1`, [id]);
    const auditsBefore = await auditCount(action, id);
    await dataSource.query(`CREATE FUNCTION fail_${action.toLowerCase()}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced audit rollback'; END $$`);
    await dataSource.query(`CREATE TRIGGER fail_${action.toLowerCase()} BEFORE INSERT ON audit_logs FOR EACH ROW WHEN (NEW.action = '${action}') EXECUTE FUNCTION fail_${action.toLowerCase()}()`);
    try {
      expect((await call()).status).toBe(500);
      expect(await dataSource.query(`SELECT active, archived_at FROM ${table} WHERE id = $1`, [id])).toEqual(before);
      expect(await auditCount(action, id)).toBe(auditsBefore);
    } finally {
      await dataSource.query(`DROP TRIGGER IF EXISTS fail_${action.toLowerCase()} ON audit_logs`);
      await dataSource.query(`DROP FUNCTION IF EXISTS fail_${action.toLowerCase()}()`);
    }
  }
});

function databaseOptions(database: Database) {
  return { host: database.host, port: database.port, username: database.username, password: database.password, database: database.database };
}

async function seedUser(dataSource: DataSource, id: string, email: string, role: Role) {
  await dataSource.query('INSERT INTO users (id, email, password_hash, role, active) VALUES ($1, $2, $3, $4, true)', [id, email, 'not-a-login-secret', role]);
}

async function provePhaseTwoMigrationRollback(dataSource: DataSource) {
  for (let count = 0; count < 4; count += 1) await dataSource.undoLastMigration();
  expect(await dataSource.query(`SELECT count(*) AS count FROM information_schema.columns WHERE table_name IN ('units', 'residents') AND column_name IN ('archived_at', 'archived_by_user_id')`)).toEqual([{ count: '0' }]);
  expect(await dataSource.query(`SELECT conname FROM pg_constraint WHERE conname IN ('units_code_key', 'users_email_key') ORDER BY conname`)).toEqual([{ conname: 'units_code_key' }, { conname: 'users_email_key' }]);
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await runner.query(`INSERT INTO units (code, address, parking_spaces) VALUES (' Legacy ', 'Migration Street 1', 0), ('legacy', 'Migration Street 2', 0)`);
    await expect(new HardenUnitIdentity1724600005000().up(runner)).rejects.toThrow('Normalized unit-code collisions: legacy');
    expect(await runner.query(`SELECT to_regclass('uq_units_code_normalized')`)).toEqual([{ to_regclass: null }]);
    await runner.query(`DELETE FROM units WHERE lower(btrim(code)) = 'legacy'`);
    await runner.query(`INSERT INTO users (email, password_hash, role) VALUES (' Legacy@Example.test ', 'migration', 'ADMIN'), ('legacy@example.test', 'migration', 'ADMIN')`);
    await expect(new HardenResidentIdentity1724600006000().up(runner)).rejects.toThrow('Normalized user-email collisions: legacy@example.test');
    expect(await runner.query(`SELECT to_regclass('uq_users_email_normalized')`)).toEqual([{ to_regclass: null }]);
    await runner.query(`DELETE FROM users WHERE lower(btrim(email)) = 'legacy@example.test'`);
  } finally {
    await runner.release();
  }
  await dataSource.runMigrations();
  expect(await dataSource.query(`SELECT to_regclass('uq_units_code_normalized') AS unit_index, to_regclass('uq_users_email_normalized') AS user_index`)).toEqual([{ unit_index: 'uq_units_code_normalized', user_index: 'uq_users_email_normalized' }]);
}
