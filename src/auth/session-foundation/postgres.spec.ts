import { DataSource } from 'typeorm';
import { DerivationKeyring } from './derivation-keyring';
import { DigestKeyring } from './digest-keyring';
import { SessionKeyReadiness } from './session-key-readiness';
import { SessionClassifier } from './classifier';
import { SessionPrimitiveRepository } from './session.repository';
import { RefreshOperationRepository } from './refresh-operation.repository';
import { Classification, OperationFacts } from './types';
import { SessionCleanup } from './cleanup';
import { SessionClassificationFacade } from './session-classification-facade';

const digestKey = Buffer.alloc(32, 1).toString('base64');
const derivationKey = Buffer.alloc(32, 2).toString('base64');
const USER_ID = 'c0b1c2d3-e4f5-4678-9abc-def012345678';
const SESSION_ID = 'd0b1c2d3-e4f5-4678-9abc-def012345678';
const OTHER_USER_ID = 'f0b1c2d3-e4f5-4678-9abc-def012345678';
const OTHER_SESSION_ID = 'a1b2c3d4-e5f6-4789-abcd-ef0123456789';
const CLEANUP_USER_ID = 'b1b2c3d4-e5f6-4789-abcd-ef0123456789';
const OTHER_CLEANUP_USER_ID = 'c1b2c3d4-e5f6-4789-abcd-ef0123456789';
const CLEANUP_SESSION_IDS = [
  'b2b2c3d4-e5f6-4789-abcd-ef0123456789',
  'c2b2c3d4-e5f6-4789-abcd-ef0123456789',
  'd2b2c3d4-e5f6-4789-abcd-ef0123456789',
  'e2b2c3d4-e5f6-4789-abcd-ef0123456789',
  'f2b2c3d4-e5f6-4789-abcd-ef0123456789',
] as const;

function operationFacts(operationId: string): OperationFacts {
  return {
    sessionId: SESSION_ID,
    operationId,
    presented: { version: 'digest-v1', digest: Buffer.alloc(32, 9) },
    successor: {
      generation: 1,
      digestKeyVersion: 'digest-v1',
      derivationKeyVersion: 'derive-v1',
    },
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
  };
}

describe('session key readiness PostgreSQL boundary', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? '127.0.0.1',
      port: Number(process.env.DATABASE_PORT ?? 55439),
      username: process.env.DATABASE_USER ?? 'sigra_phase0_dev',
      password: process.env.DATABASE_PASSWORD ?? 'schema-proof',
      database: process.env.DATABASE_NAME ?? 'sigra_phase0_dev',
    });
    await dataSource.initialize();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('queries all persisted version columns against their separated keyrings', async () => {
    const digestKeyring = DigestKeyring.create({
      activeVersion: 'digest-v1',
      keys: { 'digest-v1': digestKey },
    });
    const derivationKeyring = DerivationKeyring.create({
      activeVersion: 'derive-v1',
      keys: { 'derive-v1': derivationKey },
      forbiddenKeyring: digestKeyring,
    });
    const readiness = new SessionKeyReadiness(
      dataSource,
      digestKeyring,
      derivationKeyring,
    );

    await expect(readiness.onApplicationBootstrap()).resolves.toBeUndefined();
  });
});

describe('session primitive PostgreSQL boundary', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? '127.0.0.1',
      port: Number(process.env.DATABASE_PORT ?? 55439),
      username: process.env.DATABASE_USER ?? 'sigra_phase0_dev',
      password: process.env.DATABASE_PASSWORD ?? 'schema-proof',
      database: process.env.DATABASE_NAME ?? 'sigra_phase0_dev',
    });
    await dataSource.initialize();
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    await dataSource.query(
      'DELETE FROM refresh_operations WHERE session_id IN ($1, $2)',
      [SESSION_ID, OTHER_SESSION_ID],
    );
    await dataSource.query('DELETE FROM auth_sessions WHERE id IN ($1, $2)', [
      SESSION_ID,
      OTHER_SESSION_ID,
    ]);
    await dataSource.query('DELETE FROM users WHERE id IN ($1, $2)', [
      USER_ID,
      OTHER_USER_ID,
    ]);
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.query(
      `DELETE FROM refresh_operations WHERE session_id IN ($1, $2)`,
      [SESSION_ID, OTHER_SESSION_ID],
    );
    await dataSource.query(`DELETE FROM auth_sessions WHERE id IN ($1, $2)`, [
      SESSION_ID,
      OTHER_SESSION_ID,
    ]);
    await dataSource.query(`DELETE FROM users WHERE id IN ($1, $2)`, [
      USER_ID,
      OTHER_USER_ID,
    ]);
    await dataSource.query(
      `INSERT INTO users (id, email, password_hash, role) VALUES ($1, 'session-boundary@example.test', 'not-a-credential', 'ADMIN')`,
      [USER_ID],
    );
    await dataSource.query(
      `INSERT INTO auth_sessions (id, user_id, current_refresh_digest, current_digest_key_version, current_generation, current_derivation_key_version, absolute_expires_at) VALUES ($1, $2, decode(repeat('01', 32), 'hex'), 'digest-v1', 0, 'derive-v1', '2030-01-01T00:00:00.000Z')`,
      [SESSION_ID, USER_ID],
    );
  });

  it('uses the caller manager, blocks with FOR UPDATE, and rollback is atomic', async () => {
    const repository = new SessionPrimitiveRepository();
    const first = dataSource.createQueryRunner();
    const second = dataSource.createQueryRunner();
    await first.connect();
    await second.connect();
    await first.startTransaction();
    await second.startTransaction();
    const locked = await repository.lockById(first.manager, SESSION_ID);
    await first.manager.query(
      'UPDATE auth_sessions SET current_generation = $1 WHERE id = $2',
      [1, SESSION_ID],
    );
    let completed = false;
    const waiting = repository.lockById(second.manager, SESSION_ID).then(() => {
      completed = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(locked?.id).toBe(SESSION_ID);
    expect(completed).toBe(false);
    await first.rollbackTransaction();
    await waiting;
    const rows: unknown = await second.manager.query(
      'SELECT current_generation FROM auth_sessions WHERE id = $1',
      [SESSION_ID],
    );
    expect(rows).toEqual([{ current_generation: 0 }]);
    await second.rollbackTransaction();
    await first.release();
    await second.release();
  });

  it('records once, locked-rereads on zero-row conflict, and protects cross-session facts', async () => {
    const repository = new RefreshOperationRepository();
    const manager = dataSource.manager;
    const result = await repository.recordOrRead(manager, {
      sessionId: 'd0b1c2d3-e4f5-4678-9abc-def012345678',
      operationId: 'e0b1c2d3-e4f5-4678-9abc-def012345678',
      presented: { version: 'digest-v1', digest: Buffer.alloc(32, 9) },
      successor: {
        generation: 1,
        digestKeyVersion: 'digest-v1',
        derivationKeyVersion: 'derive-v1',
      },
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    });
    expect(result.kind).toBe('recorded');
    const reread = await repository.recordOrReclassify(
      manager,
      {
        sessionId: 'd0b1c2d3-e4f5-4678-9abc-def012345678',
        operationId: 'e0b1c2d3-e4f5-4678-9abc-def012345678',
        presented: { version: 'digest-v1', digest: Buffer.alloc(32, 9) },
        successor: {
          generation: 1,
          digestKeyVersion: 'digest-v1',
          derivationKeyVersion: 'derive-v1',
        },
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      },
      (operations): Classification => ({
        kind: operations.length === 1 ? 'conflict' : 'invalid',
        ...(operations.length === 1
          ? { code: 'OPERATION_MISMATCH' as const }
          : {}),
      }),
    );
    expect(reread).toEqual({ kind: 'conflict', code: 'OPERATION_MISMATCH' });
  });

  it('reclassifies a real two-writer insert race after the second writer rereads', async () => {
    const repository = new RefreshOperationRepository();
    const first = dataSource.createQueryRunner();
    const second = dataSource.createQueryRunner();
    const facts = operationFacts('e1b2c3d4-e5f6-4789-abcd-ef0123456789');
    await first.connect();
    await second.connect();
    await first.startTransaction();
    await second.startTransaction();

    const firstResult = await repository.recordOrRead(first.manager, facts);
    let secondFinished = false;
    const secondResult = repository
      .recordOrReclassify(
        second.manager,
        facts,
        (operations): Classification => ({
          kind: operations.length === 1 ? 'conflict' : 'invalid',
          ...(operations.length === 1
            ? { code: 'OPERATION_MISMATCH' as const }
            : {}),
        }),
      )
      .then((result) => {
        secondFinished = true;
        return result;
      });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(firstResult.kind).toBe('recorded');
    expect(secondFinished).toBe(false);
    await first.commitTransaction();
    await expect(secondResult).resolves.toEqual({
      kind: 'conflict',
      code: 'OPERATION_MISMATCH',
    });
    await second.commitTransaction();
    await first.release();
    await second.release();

    await expect(
      dataSource.query(
        'SELECT operation_id FROM refresh_operations WHERE session_id = $1 AND operation_id = $2',
        [SESSION_ID, facts.operationId],
      ),
    ).resolves.toEqual([{ operation_id: facts.operationId }]);
  });

  it('classifies a persisted operation from another session as a conflict', async () => {
    const operationId = 'f1b2c3d4-e5f6-4789-abcd-ef0123456789';
    await dataSource.query(
      `INSERT INTO users (id, email, password_hash, role)
       VALUES ($1, 'other-session-boundary@example.test', 'not-a-credential', 'ADMIN')`,
      [OTHER_USER_ID],
    );
    await dataSource.query(
      `INSERT INTO auth_sessions (id, user_id, current_refresh_digest, current_digest_key_version, current_generation, current_derivation_key_version, absolute_expires_at)
       VALUES ($1, $2, decode(repeat('02', 32), 'hex'), 'digest-v1', 0, 'derive-v1', '2030-01-01T00:00:00.000Z')`,
      [OTHER_SESSION_ID, OTHER_USER_ID],
    );
    await dataSource.query(
      `INSERT INTO refresh_operations (session_id, operation_id, presented_digest,
       presented_digest_key_version, result_generation, result_digest_key_version,
       result_derivation_key_version, expires_at)
       VALUES ($1, $2, decode(repeat('09', 32), 'hex'), 'digest-v1', 1, 'digest-v1', 'derive-v1', '2030-01-01T00:00:00.000Z')`,
      [OTHER_SESSION_ID, operationId],
    );

    const sessionRepository = new SessionPrimitiveRepository();
    const operationRepository = new RefreshOperationRepository();
    const locked = await sessionRepository.lockById(
      dataSource.manager,
      SESSION_ID,
    );
    const operations = await operationRepository.findForLockedSession(
      dataSource.manager,
      SESSION_ID,
      operationId,
    );
    const classifier = new SessionClassifier(
      DigestKeyring.create({
        activeVersion: 'digest-v1',
        keys: { 'digest-v1': digestKey },
      }),
      DerivationKeyring.create({
        activeVersion: 'derive-v1',
        keys: { 'derive-v1': derivationKey },
      }),
    );

    expect(
      classifier.classify(locked!, operationFacts(operationId), operations),
    ).toEqual({ kind: 'conflict', code: 'SESSION_MISMATCH' });
  });

  it('starts from a retained credential, locks its owning session, and returns the reconstructed retry credential without writes', async () => {
    const retainedCredential = 'retained-postgres-credential';
    const keyring = DigestKeyring.create({
      activeVersion: 'digest-v2',
      keys: {
        'digest-v1': digestKey,
        'digest-v2': Buffer.alloc(32, 2).toString('base64'),
      },
    });
    const derivations = DerivationKeyring.create({
      activeVersion: 'derive-v1',
      keys: { 'derive-v1': derivationKey },
    });
    const presented = keyring.digest(retainedCredential, 'digest-v1');
    const facts = {
      sessionId: SESSION_ID,
      operationId: 'a2b2c3d4-e5f6-4789-abcd-ef0123456789',
      presented,
      successor: {
        generation: 1,
        digestKeyVersion: 'digest-v2',
        derivationKeyVersion: 'derive-v1',
      },
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    };
    await dataSource.query(
      `INSERT INTO refresh_operations (session_id, operation_id, presented_digest,
       presented_digest_key_version, result_generation, result_digest_key_version,
       result_derivation_key_version, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        SESSION_ID,
        facts.operationId,
        presented.digest,
        presented.version,
        facts.successor.generation,
        facts.successor.digestKeyVersion,
        facts.successor.derivationKeyVersion,
        facts.expiresAt,
      ],
    );
    const before = (await dataSource.query(
      'SELECT current_generation FROM auth_sessions WHERE id = $1',
      [SESSION_ID],
    )) as unknown;

    await expect(
      new SessionClassificationFacade(
        keyring,
        derivations,
      ).classifyPresentedCredential(
        dataSource.manager,
        retainedCredential,
        facts,
      ),
    ).resolves.toMatchObject({
      kind: 'retry',
      credential: derivations
        .derive('refresh', SESSION_ID, facts.successor.generation)
        .toString('base64url'),
    });
    await expect(
      dataSource.query(
        'SELECT current_generation FROM auth_sessions WHERE id = $1',
        [SESSION_ID],
      ),
    ).resolves.toEqual(before);
  });
});

describe('session cleanup PostgreSQL boundary', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DATABASE_HOST ?? '127.0.0.1',
      port: Number(process.env.DATABASE_PORT ?? 55439),
      username: process.env.DATABASE_USER ?? 'sigra_phase0_dev',
      password: process.env.DATABASE_PASSWORD ?? 'schema-proof',
      database: process.env.DATABASE_NAME ?? 'sigra_phase0_dev',
    });
    await dataSource.initialize();
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    await dataSource.query(
      'DELETE FROM refresh_operations WHERE session_id = ANY($1)',
      [CLEANUP_SESSION_IDS],
    );
    await dataSource.query('DELETE FROM auth_sessions WHERE id = ANY($1)', [
      CLEANUP_SESSION_IDS,
    ]);
    await dataSource.query('DELETE FROM users WHERE id IN ($1, $2)', [
      CLEANUP_USER_ID,
      OTHER_CLEANUP_USER_ID,
    ]);
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.query(
      'DELETE FROM refresh_operations WHERE session_id = ANY($1)',
      [CLEANUP_SESSION_IDS],
    );
    await dataSource.query('DELETE FROM auth_sessions WHERE id = ANY($1)', [
      CLEANUP_SESSION_IDS,
    ]);
    await dataSource.query('DELETE FROM users WHERE id IN ($1, $2)', [
      CLEANUP_USER_ID,
      OTHER_CLEANUP_USER_ID,
    ]);
    await dataSource.query(
      `INSERT INTO users (id, email, password_hash, role) VALUES
       ($1, 'cleanup@example.test', 'not-a-credential', 'ADMIN'),
       ($2, 'other-cleanup@example.test', 'not-a-credential', 'ADMIN')`,
      [CLEANUP_USER_ID, OTHER_CLEANUP_USER_ID],
    );
  });

  it('revokes one session and then every target-user session idempotently', async () => {
    const cleanup = new SessionCleanup();
    const at = new Date('2029-01-01T00:00:00.000Z');
    await insertCleanupSessions(dataSource, [
      [CLEANUP_SESSION_IDS[0], CLEANUP_USER_ID, '2030-01-01T00:00:00.000Z'],
      [CLEANUP_SESSION_IDS[1], CLEANUP_USER_ID, '2030-01-02T00:00:00.000Z'],
      [
        CLEANUP_SESSION_IDS[2],
        OTHER_CLEANUP_USER_ID,
        '2030-01-03T00:00:00.000Z',
      ],
    ]);

    await expect(
      cleanup.revokeSession(dataSource.manager, CLEANUP_SESSION_IDS[0], at),
    ).resolves.toBe(1);
    await expect(
      cleanup.revokeSession(dataSource.manager, CLEANUP_SESSION_IDS[0], at),
    ).resolves.toBe(0);
    await expect(
      cleanup.revokeUserSessions(dataSource.manager, CLEANUP_USER_ID, at),
    ).resolves.toBe(1);
    await expect(
      cleanup.revokeUserSessions(dataSource.manager, CLEANUP_USER_ID, at),
    ).resolves.toBe(0);
    await expect(
      dataSource.query(
        'SELECT id, revoked_at FROM auth_sessions WHERE id = ANY($1) ORDER BY id',
        [CLEANUP_SESSION_IDS.slice(0, 3)],
      ),
    ).resolves.toEqual([
      { id: CLEANUP_SESSION_IDS[0], revoked_at: at },
      { id: CLEANUP_SESSION_IDS[1], revoked_at: at },
      { id: CLEANUP_SESSION_IDS[2], revoked_at: null },
    ]);
  });

  it('rejects non-positive bounds and deletes an ordered operation-first, retention-safe batch', async () => {
    const cleanup = new SessionCleanup();
    const cutoff = new Date('2029-01-01T00:00:00.000Z');
    await insertCleanupSessions(dataSource, [
      [CLEANUP_SESSION_IDS[0], CLEANUP_USER_ID, '2028-01-01T00:00:00.000Z'],
      [CLEANUP_SESSION_IDS[1], CLEANUP_USER_ID, '2028-01-02T00:00:00.000Z'],
      [CLEANUP_SESSION_IDS[2], CLEANUP_USER_ID, '2030-01-01T00:00:00.000Z'],
      [CLEANUP_SESSION_IDS[3], CLEANUP_USER_ID, '2028-01-03T00:00:00.000Z'],
    ]);
    await insertCleanupOperation(
      dataSource,
      CLEANUP_SESSION_IDS[0],
      'b3b2c3d4-e5f6-4789-abcd-ef0123456789',
      '2028-01-01T00:00:00.000Z',
    );
    await insertCleanupOperation(
      dataSource,
      CLEANUP_SESSION_IDS[1],
      'c3b2c3d4-e5f6-4789-abcd-ef0123456789',
      '2028-01-02T00:00:00.000Z',
    );
    await insertCleanupOperation(
      dataSource,
      CLEANUP_SESSION_IDS[2],
      'd3b2c3d4-e5f6-4789-abcd-ef0123456789',
      '2028-01-01T00:00:00.000Z',
    );

    await expect(cleanup.purge(dataSource.manager, cutoff, 0)).rejects.toThrow(
      'purge-limit-positive-integer',
    );
    await expect(cleanup.purge(dataSource.manager, cutoff, 3)).resolves.toEqual(
      {
        operations: 2,
        sessions: 1,
        total: 3,
      },
    );
    await expect(
      dataSource.query(
        'SELECT id FROM auth_sessions WHERE id = ANY($1) ORDER BY id',
        [CLEANUP_SESSION_IDS.slice(0, 4)],
      ),
    ).resolves.toEqual([
      { id: CLEANUP_SESSION_IDS[1] },
      { id: CLEANUP_SESSION_IDS[2] },
      { id: CLEANUP_SESSION_IDS[3] },
    ]);
    await expect(
      dataSource.query(
        'SELECT session_id FROM refresh_operations WHERE session_id = ANY($1) ORDER BY session_id',
        [CLEANUP_SESSION_IDS.slice(0, 3)],
      ),
    ).resolves.toEqual([{ session_id: CLEANUP_SESSION_IDS[2] }]);
  });

  it('gives concurrent PostgreSQL workers disjoint purge ownership with SKIP LOCKED', async () => {
    const cutoff = new Date('2029-01-01T00:00:00.000Z');
    await insertCleanupSessions(dataSource, [
      [CLEANUP_SESSION_IDS[0], CLEANUP_USER_ID, '2028-01-01T00:00:00.000Z'],
      [CLEANUP_SESSION_IDS[1], CLEANUP_USER_ID, '2028-01-02T00:00:00.000Z'],
      [CLEANUP_SESSION_IDS[2], CLEANUP_USER_ID, '2028-01-03T00:00:00.000Z'],
      [CLEANUP_SESSION_IDS[3], CLEANUP_USER_ID, '2028-01-04T00:00:00.000Z'],
    ]);
    const first = dataSource.createQueryRunner();
    const second = dataSource.createQueryRunner();
    await first.connect();
    await second.connect();
    await first.startTransaction();
    await second.startTransaction();

    const firstResult = await new SessionCleanup().purge(
      first.manager,
      cutoff,
      2,
    );
    const secondResult = await new SessionCleanup().purge(
      second.manager,
      cutoff,
      2,
    );
    expect(firstResult).toEqual({ operations: 0, sessions: 2, total: 2 });
    expect(secondResult).toEqual({ operations: 0, sessions: 2, total: 2 });
    await first.commitTransaction();
    await second.commitTransaction();
    await first.release();
    await second.release();
    await expect(
      dataSource.query('SELECT id FROM auth_sessions WHERE id = ANY($1)', [
        CLEANUP_SESSION_IDS.slice(0, 4),
      ]),
    ).resolves.toEqual([]);
  });
});

async function insertCleanupSessions(
  dataSource: DataSource,
  rows: readonly [string, string, string][],
): Promise<void> {
  for (const [id, userId, expiresAt] of rows) {
    await dataSource.query(
      `INSERT INTO auth_sessions (id, user_id, current_refresh_digest, current_digest_key_version, current_generation, current_derivation_key_version, absolute_expires_at)
       VALUES ($1, $2, decode(lpad(replace($4, '-', ''), 64, '0'), 'hex'), 'digest-v1', 0, 'derive-v1', $3)`,
      [id, userId, expiresAt, id],
    );
  }
}

function insertCleanupOperation(
  dataSource: DataSource,
  sessionId: string,
  operationId: string,
  expiresAt: string,
): Promise<unknown> {
  return dataSource.query(
    `INSERT INTO refresh_operations (session_id, operation_id, presented_digest,
     presented_digest_key_version, result_generation, result_digest_key_version,
     result_derivation_key_version, expires_at)
     VALUES ($1, $2, decode(repeat('04', 32), 'hex'), 'digest-v1', 1, 'digest-v1', 'derive-v1', $3)`,
    [sessionId, operationId, expiresAt],
  );
}
