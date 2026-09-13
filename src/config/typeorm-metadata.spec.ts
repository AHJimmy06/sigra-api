import type { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata';
import { createHash, randomUUID } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { DataSource, type EntityMetadata, type QueryRunner } from 'typeorm';
import dataSource from './typeorm.datasource';
import { InitialSchema1724600000000 } from '../migrations/1724600000000-InitialSchema';
import { AddAuditLogs1724600001000 } from '../migrations/1724600001000-AddAuditLogs';
import { HardenAccessEvents1724600002000 } from '../migrations/1724600002000-HardenAccessEvents';
import { EnforceUnitParkingLimit1724600003000 } from '../migrations/1724600003000-EnforceUnitParkingLimit';
import { AddAuthSessionSchema1724600004000 } from '../migrations/1724600004000-AddAuthSessionSchema';
import { AddAnnouncementAuthorSchema1724600009000 } from '../migrations/1724600009000-AddAnnouncementAuthorSchema';

const GENERATED_DUMP_COMMENT =
  /^-- (?:PostgreSQL database dump|Dumped from database version|Dumped by pg_dump version|PostgreSQL database dump complete).*$/;
const execFile = promisify(execFileCallback);
const OWNED_TABLES = ['auth_sessions', 'refresh_operations'];
const DISPOSABLE_POSTGRES_IMAGE = 'postgres:16-alpine';

jest.setTimeout(120_000);

type MetadataBuildableDataSource = typeof dataSource & {
  buildMetadatas(): Promise<void>;
};

function columnShape(column: ColumnMetadata) {
  return {
    name: column.databaseName,
    type: column.type,
    nullable: column.isNullable,
    primary: column.isPrimary,
    enumName: column.enumName,
  };
}

function metadataColumnShape(column: ColumnMetadata) {
  return {
    name: column.databaseName,
    type: column.type,
    length: column.length,
    nullable: column.isNullable,
    primary: column.isPrimary,
    generated: column.isGenerated,
    generationStrategy: column.generationStrategy,
    default:
      typeof column.default === 'function' ? column.default() : column.default,
  };
}

function assertExactEntityMetadata(
  metadata: EntityMetadata,
  table: 'auth_sessions' | 'refresh_operations',
): void {
  const expectedColumns =
    table === 'auth_sessions'
      ? [
          ['id', 'uuid', '', false, true, true, 'uuid', 'gen_random_uuid()'],
          ['user_id', 'uuid', '', false, false, false, undefined, undefined],
          [
            'current_refresh_digest',
            'bytea',
            '',
            false,
            false,
            false,
            undefined,
            undefined,
          ],
          [
            'current_digest_key_version',
            'varchar',
            '32',
            false,
            false,
            false,
            undefined,
            undefined,
          ],
          [
            'current_generation',
            'integer',
            '',
            false,
            false,
            false,
            undefined,
            undefined,
          ],
          [
            'current_derivation_key_version',
            'varchar',
            '32',
            false,
            false,
            false,
            undefined,
            undefined,
          ],
          [
            'absolute_expires_at',
            'timestamptz',
            '',
            false,
            false,
            false,
            undefined,
            undefined,
          ],
          [
            'revoked_at',
            'timestamptz',
            '',
            true,
            false,
            false,
            undefined,
            undefined,
          ],
          [
            'created_at',
            'timestamptz',
            '',
            false,
            false,
            false,
            undefined,
            'now()',
          ],
          [
            'updated_at',
            'timestamptz',
            '',
            false,
            false,
            false,
            undefined,
            'now()',
          ],
        ]
      : [
          ['id', 'uuid', '', false, true, true, 'uuid', 'gen_random_uuid()'],
          ['session_id', 'uuid', '', false, false, false, undefined, undefined],
          [
            'operation_id',
            'uuid',
            '',
            false,
            false,
            false,
            undefined,
            undefined,
          ],
          [
            'presented_digest',
            'bytea',
            '',
            false,
            false,
            false,
            undefined,
            undefined,
          ],
          [
            'presented_digest_key_version',
            'varchar',
            '32',
            false,
            false,
            false,
            undefined,
            undefined,
          ],
          [
            'result_generation',
            'integer',
            '',
            false,
            false,
            false,
            undefined,
            undefined,
          ],
          [
            'result_digest_key_version',
            'varchar',
            '32',
            false,
            false,
            false,
            undefined,
            undefined,
          ],
          [
            'result_derivation_key_version',
            'varchar',
            '32',
            false,
            false,
            false,
            undefined,
            undefined,
          ],
          [
            'expires_at',
            'timestamptz',
            '',
            false,
            false,
            false,
            undefined,
            undefined,
          ],
          [
            'created_at',
            'timestamptz',
            '',
            false,
            false,
            false,
            undefined,
            'now()',
          ],
        ];

  expect(metadata.tableName).toBe(table);
  expect(metadata.columns.map(metadataColumnShape).map(Object.values)).toEqual(
    expectedColumns,
  );
  expect(
    metadata.checks
      .map((check) => [check.name, check.expression])
      .sort(([left], [right]) => left.localeCompare(right)),
  ).toEqual(
    table === 'auth_sessions'
      ? [
          [
            'ck_auth_sessions_current_derivation_key_version_format',
            '"current_derivation_key_version" COLLATE "C" ~ \'^[A-Za-z0-9._-]{1,32}$\'',
          ],
          [
            'ck_auth_sessions_current_digest_key_version_format',
            '"current_digest_key_version" COLLATE "C" ~ \'^[A-Za-z0-9._-]{1,32}$\'',
          ],
          [
            'ck_auth_sessions_current_generation_nonnegative',
            '"current_generation" >= 0',
          ],
          [
            'ck_auth_sessions_current_refresh_digest_length',
            'octet_length("current_refresh_digest") = 32',
          ],
        ]
      : [
          [
            'ck_refresh_operations_presented_digest_key_version_format',
            '"presented_digest_key_version" COLLATE "C" ~ \'^[A-Za-z0-9._-]{1,32}$\'',
          ],
          [
            'ck_refresh_operations_presented_digest_length',
            'octet_length("presented_digest") = 32',
          ],
          [
            'ck_refresh_operations_result_derivation_key_version_format',
            '"result_derivation_key_version" COLLATE "C" ~ \'^[A-Za-z0-9._-]{1,32}$\'',
          ],
          [
            'ck_refresh_operations_result_digest_key_version_format',
            '"result_digest_key_version" COLLATE "C" ~ \'^[A-Za-z0-9._-]{1,32}$\'',
          ],
          [
            'ck_refresh_operations_result_generation_nonnegative',
            '"result_generation" >= 0',
          ],
        ],
  );
  expect(
    metadata.foreignKeys.map((foreignKey) => [
      foreignKey.name,
      foreignKey.columnNames,
      foreignKey.referencedTablePath,
      foreignKey.referencedColumnNames,
      foreignKey.onDelete,
    ]),
  ).toEqual(
    table === 'auth_sessions'
      ? [['fk_auth_sessions_user', ['user_id'], 'users', ['id'], 'CASCADE']]
      : [
          [
            'fk_refresh_operations_session',
            ['session_id'],
            'auth_sessions',
            ['id'],
            'CASCADE',
          ],
        ],
  );
  expect(
    metadata.indices.map((index) => [
      index.name,
      index.columns.map((column) => column.databaseName),
      index.isUnique,
      index.where,
    ]),
  ).toEqual(
    table === 'auth_sessions'
      ? [
          [
            'idx_auth_sessions_cleanup',
            ['absolute_expires_at', 'id'],
            false,
            undefined,
          ],
          [
            'idx_auth_sessions_user_revocation',
            ['user_id', 'revoked_at', 'absolute_expires_at'],
            false,
            undefined,
          ],
          [
            'uq_auth_sessions_current_refresh_digest',
            ['current_refresh_digest'],
            true,
            undefined,
          ],
        ]
      : [
          [
            'idx_refresh_operations_cleanup',
            ['expires_at', 'id'],
            false,
            undefined,
          ],
          [
            'idx_refresh_operations_presented_digest',
            ['presented_digest'],
            false,
            undefined,
          ],
          [
            'uq_refresh_operations_session_operation',
            ['session_id', 'operation_id'],
            true,
            undefined,
          ],
        ],
  );
}

function assertExactAppliedIndexCatalog(
  indexes: Array<Record<string, unknown>>,
): void {
  const expectedIndexes = [
    {
      indexname: 'auth_sessions_pkey',
      indexdef:
        'CREATE UNIQUE INDEX auth_sessions_pkey ON public.auth_sessions USING btree (id)',
    },
    {
      indexname: 'idx_auth_sessions_cleanup',
      indexdef:
        'CREATE INDEX idx_auth_sessions_cleanup ON public.auth_sessions USING btree (absolute_expires_at, id)',
    },
    {
      indexname: 'idx_auth_sessions_user_revocation',
      indexdef:
        'CREATE INDEX idx_auth_sessions_user_revocation ON public.auth_sessions USING btree (user_id, revoked_at, absolute_expires_at)',
    },
    {
      indexname: 'idx_refresh_operations_cleanup',
      indexdef:
        'CREATE INDEX idx_refresh_operations_cleanup ON public.refresh_operations USING btree (expires_at, id)',
    },
    {
      indexname: 'idx_refresh_operations_presented_digest',
      indexdef:
        'CREATE INDEX idx_refresh_operations_presented_digest ON public.refresh_operations USING btree (presented_digest)',
    },
    {
      indexname: 'refresh_operations_pkey',
      indexdef:
        'CREATE UNIQUE INDEX refresh_operations_pkey ON public.refresh_operations USING btree (id)',
    },
    {
      indexname: 'uq_auth_sessions_current_refresh_digest',
      indexdef:
        'CREATE UNIQUE INDEX uq_auth_sessions_current_refresh_digest ON public.auth_sessions USING btree (current_refresh_digest)',
    },
    {
      indexname: 'uq_refresh_operations_session_operation',
      indexdef:
        'CREATE UNIQUE INDEX uq_refresh_operations_session_operation ON public.refresh_operations USING btree (session_id, operation_id)',
    },
  ];

  if (JSON.stringify(indexes) !== JSON.stringify(expectedIndexes)) {
    throw new Error(
      'Applied catalog indexes must match the complete schema contract exactly',
    );
  }
}

function canonicalizeSchemaDump(dump: string): string {
  return dump
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !GENERATED_DUMP_COMMENT.test(line))
    .map((line) => line.replace(/[\t ]+$/u, ''))
    .join('\n');
}

function schemaDumpHash(dump: string): string {
  return createHash('sha256').update(dump).digest('hex');
}

function boundedSchemaDumpDiff(before: string, after: string): string {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const lines = [
    '--- before.sql',
    '+++ after.sql',
    '@@ schema dump mismatch @@',
  ];
  const limit = Math.min(Math.max(beforeLines.length, afterLines.length), 200);

  for (let index = 0; index < limit; index += 1) {
    if (beforeLines[index] !== afterLines[index]) {
      if (beforeLines[index] !== undefined)
        lines.push(`-${beforeLines[index]}`);
      if (afterLines[index] !== undefined) lines.push(`+${afterLines[index]}`);
    }
  }

  return lines.join('\n');
}

function assertEqualSchemaDumps(before: string, after: string): void {
  if (before === after) return;

  throw new Error(
    `Schema dump mismatch: before=${schemaDumpHash(before)} after=${schemaDumpHash(after)}\n${boundedSchemaDumpDiff(before, after)}`,
  );
}

async function runWithCleanup<T>(
  operation: () => Promise<T>,
  cleanups: Array<() => Promise<void>>,
): Promise<T> {
  let result: T | undefined;
  let primaryError: unknown;

  try {
    result = await operation();
  } catch (error) {
    primaryError = error;
  }

  const cleanupErrors: unknown[] = [];
  for (const cleanup of cleanups) {
    try {
      await cleanup();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  if (primaryError !== undefined) {
    if (cleanupErrors.length > 0) {
      throw new AggregateError([primaryError, ...cleanupErrors]);
    }
    throw primaryError instanceof Error
      ? primaryError
      : new Error(
          typeof primaryError === 'string'
            ? primaryError
            : 'Schema proof failed with a non-error value',
        );
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors);
  }

  return result!;
}

function queryRows(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    throw new Error('Expected PostgreSQL query to return rows');
  }
  return (value as unknown[]).map((row) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      throw new Error('Expected PostgreSQL query row to be an object');
    }
    return row as Record<string, unknown>;
  });
}

type DisposablePostgresPlan = {
  containerName: string;
  args: string[];
};

function createDisposablePostgresPlan(
  runId: string,
  database = 'schema_proof',
  user = 'schema_proof',
): DisposablePostgresPlan {
  const containerName = `sigra-schema-proof-${runId}`;

  return {
    containerName,
    args: [
      'run',
      '--detach',
      '--name',
      containerName,
      '--publish',
      '127.0.0.1::5432',
      '--env',
      `POSTGRES_DB=${database}`,
      '--env',
      `POSTGRES_USER=${user}`,
      '--env',
      'POSTGRES_PASSWORD',
      DISPOSABLE_POSTGRES_IMAGE,
    ],
  };
}

async function runDocker(
  args: string[],
  environment: NodeJS.ProcessEnv = process.env,
): Promise<{ stdout: string; stderr: string }> {
  return execFile('docker', args, { env: environment });
}

function postgresReadinessCommand(
  containerName: string,
  database: string,
  user: string,
): string[] {
  return [
    'exec',
    containerName,
    'psql',
    '--username',
    user,
    '--dbname',
    database,
    '--command',
    'SELECT 1',
  ];
}

async function waitForPostgres(
  containerName: string,
  database: string,
  user: string,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      await runDocker(postgresReadinessCommand(containerName, database, user));
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Disposable PostgreSQL did not become ready');
}

async function publishedPostgresPort(containerName: string): Promise<number> {
  const { stdout } = await runDocker(['port', containerName, '5432/tcp']);
  const match = stdout.trim().match(/:(\d+)$/u);
  if (match === null) {
    throw new Error('Disposable PostgreSQL did not publish a host port');
  }
  return Number(match[1]);
}

async function dumpSchema(
  containerName: string,
  database: string,
  user: string,
): Promise<string> {
  const result = await runDocker([
    'exec',
    containerName,
    'pg_dump',
    '--schema-only',
    '--no-owner',
    '--no-privileges',
    '--quote-all-identifiers',
    '--restrict-key=sigraschemaproof',
    '-U',
    user,
    '-d',
    database,
  ]);
  return canonicalizeSchemaDump(result.stdout);
}

async function extensionDeclarations(proof: DataSource): Promise<unknown[]> {
  return queryRows(
    await proof.query(`
    SELECT e.extname, e.extversion, d.classid::regclass::text AS classid,
           d.objid, d.objsubid, d.refclassid::regclass::text AS refclassid,
           d.refobjid, d.refobjsubid, d.deptype
    FROM pg_extension e
    LEFT JOIN pg_depend d ON d.refclassid = 'pg_extension'::regclass AND d.refobjid = e.oid
    ORDER BY e.extname, e.extversion, d.classid, d.objid, d.objsubid,
             d.refclassid, d.refobjid, d.refobjsubid, d.deptype
  `),
  );
}

async function assertExactAppliedOwnedCatalog(
  proof: DataSource,
): Promise<void> {
  const columns = queryRows(
    await proof.query(
      `
    SELECT table_name, column_name, ordinal_position, udt_name,
           character_maximum_length, is_nullable, column_default, is_identity
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ANY($1)
    ORDER BY table_name, ordinal_position
  `,
      [OWNED_TABLES],
    ),
  );
  const expectedColumns = [
    ['auth_sessions', 'id', 1, 'uuid', null, 'NO', 'gen_random_uuid()', 'NO'],
    ['auth_sessions', 'user_id', 2, 'uuid', null, 'NO', null, 'NO'],
    [
      'auth_sessions',
      'current_refresh_digest',
      3,
      'bytea',
      null,
      'NO',
      null,
      'NO',
    ],
    [
      'auth_sessions',
      'current_digest_key_version',
      4,
      'varchar',
      32,
      'NO',
      null,
      'NO',
    ],
    ['auth_sessions', 'current_generation', 5, 'int4', null, 'NO', null, 'NO'],
    [
      'auth_sessions',
      'current_derivation_key_version',
      6,
      'varchar',
      32,
      'NO',
      null,
      'NO',
    ],
    [
      'auth_sessions',
      'absolute_expires_at',
      7,
      'timestamptz',
      null,
      'NO',
      null,
      'NO',
    ],
    ['auth_sessions', 'revoked_at', 8, 'timestamptz', null, 'YES', null, 'NO'],
    [
      'auth_sessions',
      'created_at',
      9,
      'timestamptz',
      null,
      'NO',
      'now()',
      'NO',
    ],
    [
      'auth_sessions',
      'updated_at',
      10,
      'timestamptz',
      null,
      'NO',
      'now()',
      'NO',
    ],
    [
      'refresh_operations',
      'id',
      1,
      'uuid',
      null,
      'NO',
      'gen_random_uuid()',
      'NO',
    ],
    ['refresh_operations', 'session_id', 2, 'uuid', null, 'NO', null, 'NO'],
    ['refresh_operations', 'operation_id', 3, 'uuid', null, 'NO', null, 'NO'],
    [
      'refresh_operations',
      'presented_digest',
      4,
      'bytea',
      null,
      'NO',
      null,
      'NO',
    ],
    [
      'refresh_operations',
      'presented_digest_key_version',
      5,
      'varchar',
      32,
      'NO',
      null,
      'NO',
    ],
    [
      'refresh_operations',
      'result_generation',
      6,
      'int4',
      null,
      'NO',
      null,
      'NO',
    ],
    [
      'refresh_operations',
      'result_digest_key_version',
      7,
      'varchar',
      32,
      'NO',
      null,
      'NO',
    ],
    [
      'refresh_operations',
      'result_derivation_key_version',
      8,
      'varchar',
      32,
      'NO',
      null,
      'NO',
    ],
    [
      'refresh_operations',
      'expires_at',
      9,
      'timestamptz',
      null,
      'NO',
      null,
      'NO',
    ],
    [
      'refresh_operations',
      'created_at',
      10,
      'timestamptz',
      null,
      'NO',
      'now()',
      'NO',
    ],
  ];
  expect(columns.map((column) => Object.values(column))).toEqual(
    expectedColumns,
  );

  const constraints = queryRows(
    await proof.query(
      `
    SELECT conname, contype, conrelid::regclass::text AS table_name,
           ARRAY(SELECT attname FROM unnest(conkey) WITH ORDINALITY AS keys(attnum, position)
                 JOIN pg_attribute attribute ON attribute.attrelid = conrelid AND attribute.attnum = keys.attnum
                 ORDER BY keys.position) AS column_names,
           confrelid::regclass::text AS referenced_table,
           ARRAY(SELECT attname FROM unnest(confkey) WITH ORDINALITY AS keys(attnum, position)
                 JOIN pg_attribute attribute ON attribute.attrelid = confrelid AND attribute.attnum = keys.attnum
                 ORDER BY keys.position) AS referenced_column_names,
           confdeltype, pg_get_constraintdef(oid, false) AS definition
    FROM pg_constraint
    WHERE conrelid = ANY($1::regclass[])
    ORDER BY conname
  `,
      ['{"auth_sessions","refresh_operations"}'],
    ),
  );
  expect(constraints).toEqual([
    {
      table_name: 'auth_sessions',
      conname: 'auth_sessions_pkey',
      contype: 'p',
      column_names: '{id}',
      referenced_table: '-',
      referenced_column_names: '{}',
      confdeltype: ' ',
      definition: 'PRIMARY KEY (id)',
    },
    {
      table_name: 'auth_sessions',
      conname: 'ck_auth_sessions_current_derivation_key_version_format',
      contype: 'c',
      column_names: '{current_derivation_key_version}',
      referenced_table: '-',
      referenced_column_names: '{}',
      confdeltype: ' ',
      definition:
        'CHECK ((((current_derivation_key_version)::text COLLATE "C") ~ \'^[A-Za-z0-9._-]{1,32}$\'::text))',
    },
    {
      table_name: 'auth_sessions',
      conname: 'ck_auth_sessions_current_digest_key_version_format',
      contype: 'c',
      column_names: '{current_digest_key_version}',
      referenced_table: '-',
      referenced_column_names: '{}',
      confdeltype: ' ',
      definition:
        'CHECK ((((current_digest_key_version)::text COLLATE "C") ~ \'^[A-Za-z0-9._-]{1,32}$\'::text))',
    },
    {
      table_name: 'auth_sessions',
      conname: 'ck_auth_sessions_current_generation_nonnegative',
      contype: 'c',
      column_names: '{current_generation}',
      referenced_table: '-',
      referenced_column_names: '{}',
      confdeltype: ' ',
      definition: 'CHECK ((current_generation >= 0))',
    },
    {
      table_name: 'auth_sessions',
      conname: 'ck_auth_sessions_current_refresh_digest_length',
      contype: 'c',
      column_names: '{current_refresh_digest}',
      referenced_table: '-',
      referenced_column_names: '{}',
      confdeltype: ' ',
      definition: 'CHECK ((octet_length(current_refresh_digest) = 32))',
    },
    {
      table_name: 'refresh_operations',
      conname: 'ck_refresh_operations_presented_digest_key_version_format',
      contype: 'c',
      column_names: '{presented_digest_key_version}',
      referenced_table: '-',
      referenced_column_names: '{}',
      confdeltype: ' ',
      definition:
        'CHECK ((((presented_digest_key_version)::text COLLATE "C") ~ \'^[A-Za-z0-9._-]{1,32}$\'::text))',
    },
    {
      table_name: 'refresh_operations',
      conname: 'ck_refresh_operations_presented_digest_length',
      contype: 'c',
      column_names: '{presented_digest}',
      referenced_table: '-',
      referenced_column_names: '{}',
      confdeltype: ' ',
      definition: 'CHECK ((octet_length(presented_digest) = 32))',
    },
    {
      table_name: 'refresh_operations',
      conname: 'ck_refresh_operations_result_derivation_key_version_format',
      contype: 'c',
      column_names: '{result_derivation_key_version}',
      referenced_table: '-',
      referenced_column_names: '{}',
      confdeltype: ' ',
      definition:
        'CHECK ((((result_derivation_key_version)::text COLLATE "C") ~ \'^[A-Za-z0-9._-]{1,32}$\'::text))',
    },
    {
      table_name: 'refresh_operations',
      conname: 'ck_refresh_operations_result_digest_key_version_format',
      contype: 'c',
      column_names: '{result_digest_key_version}',
      referenced_table: '-',
      referenced_column_names: '{}',
      confdeltype: ' ',
      definition:
        'CHECK ((((result_digest_key_version)::text COLLATE "C") ~ \'^[A-Za-z0-9._-]{1,32}$\'::text))',
    },
    {
      table_name: 'refresh_operations',
      conname: 'ck_refresh_operations_result_generation_nonnegative',
      contype: 'c',
      column_names: '{result_generation}',
      referenced_table: '-',
      referenced_column_names: '{}',
      confdeltype: ' ',
      definition: 'CHECK ((result_generation >= 0))',
    },
    {
      table_name: 'auth_sessions',
      conname: 'fk_auth_sessions_user',
      contype: 'f',
      column_names: '{user_id}',
      referenced_table: 'users',
      referenced_column_names: '{id}',
      confdeltype: 'c',
      definition:
        'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    },
    {
      table_name: 'refresh_operations',
      conname: 'fk_refresh_operations_session',
      contype: 'f',
      column_names: '{session_id}',
      referenced_table: 'auth_sessions',
      referenced_column_names: '{id}',
      confdeltype: 'c',
      definition:
        'FOREIGN KEY (session_id) REFERENCES auth_sessions(id) ON DELETE CASCADE',
    },
    {
      table_name: 'refresh_operations',
      conname: 'refresh_operations_pkey',
      contype: 'p',
      column_names: '{id}',
      referenced_table: '-',
      referenced_column_names: '{}',
      confdeltype: ' ',
      definition: 'PRIMARY KEY (id)',
    },
  ]);

  const indexes = queryRows(
    await proof.query(
      `
    SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = ANY($1)
    ORDER BY indexname
  `,
      [OWNED_TABLES],
    ),
  );
  assertExactAppliedIndexCatalog(indexes);
  expect(await proof.query('SELECT * FROM "auth_sessions"')).toEqual([]);
  expect(await proof.query('SELECT * FROM "refresh_operations"')).toEqual([]);
}

async function runDisposableSchemaProof(): Promise<void> {
  const runId = `${process.pid}-${randomUUID()}`;
  const database = `sigra_schema_proof_${process.pid}`;
  const user = `schema_proof_${process.pid}`;
  const password = randomUUID();
  const plan = createDisposablePostgresPlan(runId, database, user);
  const environment = {
    ...process.env,
    POSTGRES_PASSWORD: password,
  };
  let started = false;
  let proof: DataSource | undefined;

  await runWithCleanup(async () => {
    await runDocker(plan.args, environment);
    started = true;
    await waitForPostgres(plan.containerName, database, user);
    const port = await publishedPostgresPort(plan.containerName);
    proof = new DataSource({
      ...dataSource.options,
      host: '127.0.0.1',
      port,
      username: user,
      password,
      database,
      migrations: [
        InitialSchema1724600000000,
        AddAuditLogs1724600001000,
        HardenAccessEvents1724600002000,
        EnforceUnitParkingLimit1724600003000,
      ],
    });
    await proof.initialize();
    await proof.runMigrations();
    const beforeDump = await dumpSchema(plan.containerName, database, user);
    const beforeExtensions = await extensionDeclarations(proof);
    const runner = proof.createQueryRunner();
    try {
      await new AddAuthSessionSchema1724600004000().up(runner);
    } finally {
      await runner.release();
    }
    await assertExactAppliedOwnedCatalog(proof);
    const downRunner = proof.createQueryRunner();
    try {
      await new AddAuthSessionSchema1724600004000().down(downRunner);
    } finally {
      await downRunner.release();
    }
    expect(
      await proof.query(`SELECT to_regclass('public.auth_sessions')`),
    ).toEqual([{ to_regclass: null }]);
    expect(
      await proof.query(`SELECT to_regclass('public.refresh_operations')`),
    ).toEqual([{ to_regclass: null }]);
    expect(await extensionDeclarations(proof)).toEqual(beforeExtensions);
    assertEqualSchemaDumps(
      beforeDump,
      await dumpSchema(plan.containerName, database, user),
    );
  }, [
    async () => proof?.destroy(),
    async () =>
      started
        ? runDocker(['rm', '--force', plan.containerName]).then(() => undefined)
        : undefined,
  ]);
}

describe('PostgreSQL entity metadata', () => {
  beforeAll(async () => {
    await (dataSource as MetadataBuildableDataSource).buildMetadatas();
  });

  it('constructs production entity metadata without a database connection', () => {
    expect(dataSource.entityMetadatas.length).toBeGreaterThan(0);
    expect(dataSource.options.type).toBe('postgres');
    expect(dataSource.isInitialized).toBe(false);
  });

  it('maps every audit column to the migration schema', async () => {
    const metadata = dataSource.getMetadata('audit_logs');
    expect(metadata.columns.map(columnShape)).toEqual([
      {
        name: 'audit_id',
        type: 'uuid',
        nullable: false,
        primary: true,
        enumName: undefined,
      },
      {
        name: 'actor_user_id',
        type: 'uuid',
        nullable: true,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'actor_role',
        type: 'enum',
        nullable: true,
        primary: false,
        enumName: 'user_role',
      },
      {
        name: 'action',
        type: 'varchar',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'resource_type',
        type: 'varchar',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'resource_id',
        type: 'uuid',
        nullable: true,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'metadata',
        type: 'jsonb',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'ip',
        type: 'varchar',
        nullable: true,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'created_at',
        type: 'timestamptz',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
    ]);

    const queries: string[] = [];
    await new AddAuditLogs1724600001000().up({
      query: (sql: string) => {
        queries.push(sql);
        return Promise.resolve();
      },
    } as never);
    const createAuditTable = queries.find((sql) =>
      sql.startsWith('CREATE TABLE "audit_logs"'),
    );
    expect(createAuditTable).toBe(
      `CREATE TABLE "audit_logs" ("audit_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "actor_user_id" uuid REFERENCES "users"("id") ON DELETE RESTRICT, "actor_role" "user_role", "action" varchar NOT NULL, "resource_type" varchar NOT NULL, "resource_id" uuid, "metadata" jsonb NOT NULL DEFAULT '{}', "ip" varchar, "created_at" timestamptz NOT NULL DEFAULT now())`,
    );
  });

  it('aligns all Phase 0 entity columns added by the migration', () => {
    const announcement = dataSource.getMetadata('announcements');
    expect(
      columnShape(announcement.findColumnWithPropertyName('status')!),
    ).toMatchObject({
      name: 'status',
      type: 'enum',
      nullable: false,
      enumName: 'announcement_status',
    });
    expect(
      columnShape(announcement.findColumnWithPropertyName('authorUserId')!),
    ).toMatchObject({
      name: 'author_user_id',
      type: 'uuid',
      nullable: true,
    });

    const ticket = dataSource.getMetadata('maintenance_tickets');
    expect(
      columnShape(ticket.findColumnWithPropertyName('priority')!),
    ).toMatchObject({
      name: 'priority',
      type: 'enum',
      nullable: false,
      enumName: 'ticket_priority',
    });

    const accessEvent = dataSource.getMetadata('access_events');
    expect(
      columnShape(accessEvent.findColumnWithPropertyName('residentId')!),
    ).toMatchObject({
      name: 'resident_id',
      type: 'uuid',
      nullable: true,
    });
    expect(
      columnShape(accessEvent.findColumnWithPropertyName('unitId')!),
    ).toMatchObject({
      name: 'unit_id',
      type: 'uuid',
      nullable: true,
    });
    expect(
      columnShape(accessEvent.findColumnWithPropertyName('createdAt')!),
    ).toMatchObject({
      name: 'created_at',
      type: 'timestamptz',
      nullable: false,
    });
    expect(
      columnShape(
        accessEvent.findColumnWithPropertyName('requestFingerprint')!,
      ),
    ).toMatchObject({
      name: 'request_fingerprint',
      type: 'varchar',
      nullable: true,
    });
    expect(
      columnShape(accessEvent.findColumnWithPropertyName('requestId')!),
    ).toMatchObject({
      name: 'request_id',
      type: 'varchar',
      nullable: true,
    });
    expect(accessEvent.indices.map((index) => index.name)).toContain(
      'idx_access_events_filters',
    );
  });

  it('adds reversible access traceability and filter indexes', async () => {
    const upQueries: string[] = [];
    const downQueries: string[] = [];
    const migration = new HardenAccessEvents1724600002000();
    await migration.up({
      query: (sql: string) => {
        upQueries.push(sql);
        return Promise.resolve();
      },
    } as never);
    await migration.down({
      query: (sql: string) => {
        downQueries.push(sql);
        return Promise.resolve();
      },
    } as never);

    expect(upQueries.join('\n')).toContain('"request_fingerprint" varchar(64)');
    expect(upQueries.join('\n')).toContain('"request_id" varchar(128)');
    expect(upQueries.join('\n')).toContain('"idx_access_events_filters"');
    expect(downQueries.join('\n')).toContain(
      'DROP COLUMN IF EXISTS "request_id"',
    );
  });

  it('enforces the documented parking-space maximum in PostgreSQL', async () => {
    const upQueries: string[] = [];
    const downQueries: string[] = [];
    const migration = new EnforceUnitParkingLimit1724600003000();
    await migration.up({
      query: (sql: string) => {
        upQueries.push(sql);
        return Promise.resolve();
      },
    } as never);
    await migration.down({
      query: (sql: string) => {
        downQueries.push(sql);
        return Promise.resolve();
      },
    } as never);

    expect(upQueries).toEqual([
      expect.stringContaining('CHECK ("parking_spaces" <= 1000)'),
    ]);
    expect(downQueries).toEqual([
      expect.stringContaining('DROP CONSTRAINT IF EXISTS'),
    ]);
  });

  it('maps the exact secret-free session and refresh-operation metadata', () => {
    const session = dataSource.getMetadata('auth_sessions');
    const operation = dataSource.getMetadata('refresh_operations');

    assertExactEntityMetadata(session, 'auth_sessions');
    assertExactEntityMetadata(operation, 'refresh_operations');

    expect(session.columns.map(columnShape)).toEqual([
      {
        name: 'id',
        type: 'uuid',
        nullable: false,
        primary: true,
        enumName: undefined,
      },
      {
        name: 'user_id',
        type: 'uuid',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'current_refresh_digest',
        type: 'bytea',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'current_digest_key_version',
        type: 'varchar',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'current_generation',
        type: 'integer',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'current_derivation_key_version',
        type: 'varchar',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'absolute_expires_at',
        type: 'timestamptz',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'revoked_at',
        type: 'timestamptz',
        nullable: true,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'created_at',
        type: 'timestamptz',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'updated_at',
        type: 'timestamptz',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
    ]);
    expect(operation.columns.map(columnShape)).toEqual([
      {
        name: 'id',
        type: 'uuid',
        nullable: false,
        primary: true,
        enumName: undefined,
      },
      {
        name: 'session_id',
        type: 'uuid',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'operation_id',
        type: 'uuid',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'presented_digest',
        type: 'bytea',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'presented_digest_key_version',
        type: 'varchar',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'result_generation',
        type: 'integer',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'result_digest_key_version',
        type: 'varchar',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'result_derivation_key_version',
        type: 'varchar',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'expires_at',
        type: 'timestamptz',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
      {
        name: 'created_at',
        type: 'timestamptz',
        nullable: false,
        primary: false,
        enumName: undefined,
      },
    ]);
    expect(session.ownRelations).toHaveLength(1);
    for (const metadata of [session, operation]) {
      expect(metadata.columns.map((column) => column.databaseName)).not.toEqual(
        expect.arrayContaining([
          expect.stringMatching(/raw.*refresh|csrf|access.*token|password/i),
        ]),
      );
    }
  });

  it('registers and emits the reversible exact session schema SQL', async () => {
    const migration = new AddAuthSessionSchema1724600004000();
    const upQueries: string[] = [];
    const downQueries: string[] = [];
    const queryRunner = {
      query: (sql: string) => Promise.resolve(upQueries.push(sql)),
    } as unknown as QueryRunner;
    const downQueryRunner = {
      query: (sql: string) => Promise.resolve(downQueries.push(sql)),
    } as unknown as QueryRunner;
    await migration.up(queryRunner);
    await migration.down(downQueryRunner);

    expect(
      dataSource.migrations.filter((item) => item.name === migration.name),
    ).toHaveLength(1);
    expect(upQueries).toHaveLength(8);
    expect(upQueries[0]).toContain('CREATE TABLE "auth_sessions"');
    expect(upQueries[1]).toContain('CREATE TABLE "refresh_operations"');
    expect(upQueries.join('\n')).toContain(
      'COLLATE "C" ~ \'^[A-Za-z0-9._-]{1,32}$\'',
    );
    expect(upQueries.join('\n')).toContain('"fk_auth_sessions_user"');
    expect(upQueries.join('\n')).toContain('"fk_refresh_operations_session"');
    expect(upQueries.join('\n')).toContain(
      '"uq_auth_sessions_current_refresh_digest"',
    );
    expect(upQueries.join('\n')).toContain(
      '"uq_refresh_operations_session_operation"',
    );
    expect(downQueries.join('\n')).not.toMatch(/CASCADE/);
    expect(downQueries).toEqual([
      'DROP TABLE "refresh_operations"',
      'DROP TABLE "auth_sessions"',
    ]);
  });

  it('registers only the additive 3A author schema with exact rollback order', async () => {
    const migration = new AddAnnouncementAuthorSchema1724600009000();
    const up: string[] = [];
    const down: string[] = [];
    await migration.up({
      query: (sql: string) => Promise.resolve(up.push(sql)),
    } as never);
    await migration.down({
      query: (sql: string) => Promise.resolve(down.push(sql)),
    } as never);

    expect(
      dataSource.migrations.filter((item) => item.name === migration.name),
    ).toHaveLength(1);
    expect(dataSource.migrations.at(-1)?.name).toBe(migration.name);
    expect(up.join('\n')).toContain('"display_name" varchar(120)');
    expect(up.join('\n')).toContain('"author_id_snapshot" uuid');
    expect(up.join('\n')).toContain(
      '"ck_announcements_live_author_matches_snapshot"',
    );
    expect(up.join('\n')).toContain(
      '"idx_announcements_admin_status_updated_id"',
    );
    expect(up.join('\n')).not.toMatch(
      /announcement_status|author_user_id.*REFERENCES|pg_trgm/,
    );
    const announcement = dataSource.getMetadata('announcements');
    expect(
      announcement.findColumnWithPropertyName('authorEmailSnapshot')
        ?.isNullable,
    ).toBe(true);
    expect(
      announcement.relations.find(
        (relation) => relation.propertyName === 'author',
      )?.createForeignKeyConstraints,
    ).toBe(false);
    expect(down).toEqual([
      'DROP INDEX "idx_announcements_author_user_id"',
      'DROP INDEX "idx_announcements_admin_status_updated_id"',
      'ALTER TABLE "announcements" DROP CONSTRAINT "ck_announcements_published_at"',
      'ALTER TABLE "announcements" DROP CONSTRAINT "ck_announcements_live_author_matches_snapshot"',
      'ALTER TABLE "announcements" DROP CONSTRAINT "ck_announcements_author_snapshot"',
      'ALTER TABLE "users" DROP CONSTRAINT "ck_users_display_name_valid"',
      'ALTER TABLE "announcements" DROP COLUMN "author_email_snapshot"',
      'ALTER TABLE "announcements" DROP COLUMN "author_display_name_snapshot"',
      'ALTER TABLE "announcements" DROP COLUMN "author_id_snapshot"',
      'ALTER TABLE "users" DROP COLUMN "display_name"',
    ]);
  });

  it('canonicalizes only generated pg_dump headers and whitespace', () => {
    const dump = [
      '-- PostgreSQL database dump',
      '-- Dumped from database version 16.0',
      'CREATE TABLE "users" ("id" uuid);  ',
      '-- PostgreSQL database dump complete',
      '',
    ].join('\r\n');

    expect(canonicalizeSchemaDump(dump)).toBe(
      'CREATE TABLE "users" ("id" uuid);\n',
    );
  });

  it('preserves collation, regex, casts, and SQL ordering in canonical dumps', () => {
    const semanticSql =
      'CHECK (("key_version" COLLATE "C" ~ \'^[A-Za-z0-9._-]{1,32}$\'))\n';

    expect(canonicalizeSchemaDump(semanticSql)).toBe(semanticSql);
  });

  it('retains the primary failure and aggregates every cleanup failure', async () => {
    const primary = new Error('child migration failed');
    const cleanupOne = new Error('connection cleanup failed');
    const cleanupTwo = new Error('compose cleanup failed');

    await expect(
      runWithCleanup(
        () => Promise.reject(primary),
        [() => Promise.reject(cleanupOne), () => Promise.reject(cleanupTwo)],
      ),
    ).rejects.toMatchObject({ errors: [primary, cleanupOne, cleanupTwo] });
  });

  it('plans a uniquely named PostgreSQL 16 container with a dynamic host port and no volume', () => {
    const plan = createDisposablePostgresPlan('test-run');

    expect(plan).toEqual({
      containerName: 'sigra-schema-proof-test-run',
      args: [
        'run',
        '--detach',
        '--name',
        'sigra-schema-proof-test-run',
        '--publish',
        '127.0.0.1::5432',
        '--env',
        'POSTGRES_DB=schema_proof',
        '--env',
        'POSTGRES_USER=schema_proof',
        '--env',
        'POSTGRES_PASSWORD',
        'postgres:16-alpine',
      ],
    });
    expect(plan.args).not.toEqual(
      expect.arrayContaining(['55439', '--volume']),
    );
  });

  it('reports a bounded dump mismatch without normalizing SQL semantics', () => {
    expect(() =>
      assertEqualSchemaDumps(
        'CREATE TABLE "users" ("id" uuid);\n',
        'CREATE TABLE "users" ("id" bigint);\n',
      ),
    ).toThrow('Schema dump mismatch');
  });

  it('rejects catalog index uniqueness, key-order, and filter drift', () => {
    expect(() =>
      assertExactAppliedIndexCatalog([
        {
          indexname: 'idx_auth_sessions_cleanup',
          indexdef:
            'CREATE INDEX idx_auth_sessions_cleanup ON public.auth_sessions USING btree (id, absolute_expires_at) WHERE revoked_at IS NULL',
        },
      ]),
    ).toThrow('exactly');
  });

  it('rejects entity metadata index-filter drift', () => {
    const metadata = dataSource.getMetadata('auth_sessions');
    const drifted = Object.assign(Object.create(metadata), {
      indices: metadata.indices.map((index) =>
        index.name === 'idx_auth_sessions_cleanup'
          ? { ...index, where: 'revoked_at IS NULL' }
          : index,
      ),
    }) as EntityMetadata;

    expect(() => assertExactEntityMetadata(drifted, 'auth_sessions')).toThrow();
  });

  it('proves the applied catalog and canonical rollback with disposable PostgreSQL', async () => {
    await runDisposableSchemaProof();
  }, 120_000);

  it('probes the disposable database with an authenticated query before TypeORM connects', () => {
    expect(
      postgresReadinessCommand('proof', 'schema_proof', 'schema_user'),
    ).toEqual([
      'exec',
      'proof',
      'psql',
      '--username',
      'schema_user',
      '--dbname',
      'schema_proof',
      '--command',
      'SELECT 1',
    ]);
  });
});
