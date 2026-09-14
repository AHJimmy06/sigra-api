import { DataSource, type MigrationInterface } from 'typeorm';
import { AnnouncementChange } from '../src/announcements/announcement-change.entity';
import dataSource from '../src/config/typeorm.datasource';
import { AddAnnouncementChangeFeed1724600010000 } from '../src/migrations/1724600010000-AddAnnouncementChangeFeed';
import { startDisposablePostgres } from './support/disposable-postgres';

jest.setTimeout(120_000);

const publishedEarlierId = '11111111-1111-4111-8111-111111111111';
const publishedLaterId = '22222222-2222-4222-8222-222222222222';
const draftId = '33333333-3333-4333-8333-333333333333';

describe('announcement change-feed migration', () => {
  let postgres: Awaited<ReturnType<typeof startDisposablePostgres>>;
  let database: DataSource;

  beforeAll(async () => {
    postgres = await startDisposablePostgres('announcement-change-feed');
    database = new DataSource({
      ...dataSource.options,
      ...postgres.options,
      migrations: (
        dataSource.options.migrations as Array<new () => MigrationInterface>
      ).slice(0, -1),
    });
    await database.initialize();
    await database.runMigrations();
    await seedAnnouncements(database);
  });

  afterAll(async () => {
    if (database?.isInitialized) await database.destroy();
    await postgres?.stop();
  });

  it('is reversible, parity-safe, deterministic, and preserves Phase 3A/3B announcement data', async () => {
    const before = await announcementRows(database);
    const migration = new AddAnnouncementChangeFeed1724600010000();
    const runner = database.createQueryRunner();
    await migration.up(runner);

    expect(await changeRows(database)).toEqual([
      {
        position: '1',
        announcement_id: publishedEarlierId,
        kind: 'UPSERT',
        action: 'PUBLISHED',
        title: 'Earlier publication',
        body: 'A published body preserved by change feed migration.',
        author_display_name: 'First Author',
      },
      {
        position: '2',
        announcement_id: publishedLaterId,
        kind: 'UPSERT',
        action: 'PUBLISHED',
        title: 'Later publication',
        body: 'Another published body preserved by change feed migration.',
        author_display_name: 'Second Author',
      },
    ]);
    expect(
      await database.query('SELECT id, value FROM announcement_change_clock'),
    ).toEqual([{ id: 1, value: '2' }]);
    expect(await announcementRows(database)).toEqual(before);
    expect(await schemaCatalog(database)).toEqual({
      clockColumns: [
        {
          column_name: 'id',
          data_type: 'smallint',
          udt_name: 'int2',
          numeric_precision: 16,
          numeric_scale: 0,
          character_maximum_length: null,
          is_nullable: 'NO',
          column_default: null,
        },
        {
          column_name: 'value',
          data_type: 'numeric',
          udt_name: 'numeric',
          numeric_precision: 20,
          numeric_scale: 0,
          character_maximum_length: null,
          is_nullable: 'NO',
          column_default: null,
        },
      ],
      changeColumns: [
        {
          column_name: 'position',
          data_type: 'numeric',
          udt_name: 'numeric',
          numeric_precision: 20,
          numeric_scale: 0,
          character_maximum_length: null,
          is_nullable: 'NO',
          column_default: null,
        },
        {
          column_name: 'announcement_id',
          data_type: 'uuid',
          udt_name: 'uuid',
          numeric_precision: null,
          numeric_scale: null,
          character_maximum_length: null,
          is_nullable: 'NO',
          column_default: null,
        },
        {
          column_name: 'kind',
          data_type: 'character varying',
          udt_name: 'varchar',
          numeric_precision: null,
          numeric_scale: null,
          character_maximum_length: null,
          is_nullable: 'NO',
          column_default: null,
        },
        {
          column_name: 'action',
          data_type: 'character varying',
          udt_name: 'varchar',
          numeric_precision: null,
          numeric_scale: null,
          character_maximum_length: null,
          is_nullable: 'NO',
          column_default: null,
        },
        {
          column_name: 'title',
          data_type: 'text',
          udt_name: 'text',
          numeric_precision: null,
          numeric_scale: null,
          character_maximum_length: null,
          is_nullable: 'YES',
          column_default: null,
        },
        {
          column_name: 'body',
          data_type: 'text',
          udt_name: 'text',
          numeric_precision: null,
          numeric_scale: null,
          character_maximum_length: null,
          is_nullable: 'YES',
          column_default: null,
        },
        {
          column_name: 'published_at',
          data_type: 'timestamp with time zone',
          udt_name: 'timestamptz',
          numeric_precision: null,
          numeric_scale: null,
          character_maximum_length: null,
          is_nullable: 'YES',
          column_default: null,
        },
        {
          column_name: 'author_display_name',
          data_type: 'character varying',
          udt_name: 'varchar',
          numeric_precision: null,
          numeric_scale: null,
          character_maximum_length: 120,
          is_nullable: 'YES',
          column_default: null,
        },
        {
          column_name: 'occurred_at',
          data_type: 'timestamp with time zone',
          udt_name: 'timestamptz',
          numeric_precision: null,
          numeric_scale: null,
          character_maximum_length: null,
          is_nullable: 'NO',
          column_default: null,
        },
      ],
      constraints: [
        { name: 'announcement_change_clock_pkey', type: 'p' },
        { name: 'ck_announcement_change_clock_singleton', type: 'c' },
        { name: 'ck_announcement_change_clock_uint64', type: 'c' },
        { name: 'announcement_changes_pkey', type: 'p' },
        { name: 'ck_announcement_changes_kind_action', type: 'c' },
        { name: 'ck_announcement_changes_payload', type: 'c' },
        { name: 'ck_announcement_changes_position_uint64', type: 'c' },
        { name: 'fk_announcement_changes_announcement', type: 'f' },
      ],
      index: {
        name: 'idx_announcement_changes_announcement_position',
        unique: false,
        primary: false,
      },
    });
    await expectSchemaConstraints(database);
    await expectRuntimeConstraints(database);
    expect(
      database
        .getMetadata(AnnouncementChange)
        .foreignKeys.map((foreignKey) => ({
          columns: foreignKey.columnNames,
          referencedTable: foreignKey.referencedEntityMetadata.tableName,
          referencedColumns: foreignKey.referencedColumnNames,
          onDelete: foreignKey.onDelete,
        })),
    ).toEqual([
      {
        columns: ['announcement_id'],
        referencedTable: 'announcements',
        referencedColumns: ['id'],
        onDelete: 'RESTRICT',
      },
    ]);

    await migration.down(runner);
    expect(await announcementRows(database)).toEqual(before);
    expect(
      await database.query(
        `SELECT to_regclass('announcement_changes') AS changes`,
      ),
    ).toEqual([{ changes: null }]);
    expect(
      await database.query(
        `SELECT to_regclass('announcement_change_clock') AS clock`,
      ),
    ).toEqual([{ clock: null }]);

    await migration.up(runner);
    await runner.release();
    expect(await changeRows(database)).toEqual([
      expect.objectContaining({
        position: '1',
        announcement_id: publishedEarlierId,
      }),
      expect.objectContaining({
        position: '2',
        announcement_id: publishedLaterId,
      }),
    ]);
    expect(
      await database.query(
        'SELECT value FROM announcement_change_clock WHERE id = 1',
      ),
    ).toEqual([{ value: '2' }]);
  });
});

async function seedAnnouncements(database: DataSource) {
  await database.query(
    `INSERT INTO announcements (id, title, body, status, published_at, author_id_snapshot, author_display_name_snapshot, author_email_snapshot, created_at)
     VALUES
       ($1, 'Earlier publication', 'A published body preserved by change feed migration.', 'PUBLISHED', '2026-01-01T00:00:00.000Z', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'First Author', 'first@example.test', '2026-01-02T00:00:00.000Z'),
       ($2, 'Later publication', 'Another published body preserved by change feed migration.', 'PUBLISHED', '2026-01-02T00:00:00.000Z', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Second Author', 'second@example.test', '2026-01-01T00:00:00.000Z'),
       ($3, 'Draft preserved', 'A draft body that must remain without a change.', 'DRAFT', NULL, NULL, NULL, NULL, '2026-01-03T00:00:00.000Z')`,
    [publishedEarlierId, publishedLaterId, draftId],
  );
}

function announcementRows(database: DataSource): Promise<unknown[]> {
  return queryRows(
    database,
    'SELECT id, title, body, status, published_at, author_display_name_snapshot, created_at FROM announcements ORDER BY id',
  );
}

function changeRows(database: DataSource): Promise<unknown[]> {
  return queryRows(
    database,
    'SELECT position, announcement_id, kind, action, title, body, author_display_name FROM announcement_changes ORDER BY position',
  );
}

async function schemaCatalog(database: DataSource) {
  const columnQuery = (table: string) =>
    queryRows(
      database,
      `SELECT column_name, data_type, udt_name, numeric_precision, numeric_scale, character_maximum_length, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`,
    );
  const constraints = await queryRows(
    database,
    `SELECT conname AS name, contype AS type FROM pg_constraint WHERE conrelid IN ('announcement_change_clock'::regclass, 'announcement_changes'::regclass) ORDER BY conrelid::regclass::text, conname`,
  );
  const index = await queryOne(
    database,
    `SELECT indexrelid::regclass::text AS name, indisunique AS unique, indisprimary AS primary FROM pg_index WHERE indexrelid = 'idx_announcement_changes_announcement_position'::regclass`,
  );
  return {
    clockColumns: await columnQuery('announcement_change_clock'),
    changeColumns: await columnQuery('announcement_changes'),
    constraints,
    index,
  };
}

async function expectSchemaConstraints(database: DataSource) {
  const definitions = await queryRows(
    database,
    `SELECT conname AS name, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid IN ('announcement_change_clock'::regclass, 'announcement_changes'::regclass) ORDER BY conname`,
  );
  const definitionByName = new Map(
    definitions.map((row) => {
      const { name, definition } = row as Record<string, string>;
      return [name, definition.replaceAll('"', '')];
    }),
  );
  expect(definitionByName.get('announcement_change_clock_pkey')).toBe(
    'PRIMARY KEY (id)',
  );
  expect(definitionByName.get('announcement_changes_pkey')).toBe(
    'PRIMARY KEY (position)',
  );
  expect(definitionByName.get('fk_announcement_changes_announcement')).toBe(
    'FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE RESTRICT',
  );
  expect(
    definitionByName.get('ck_announcement_change_clock_singleton'),
  ).toContain('id = 1');
  for (const name of [
    'ck_announcement_change_clock_uint64',
    'ck_announcement_changes_position_uint64',
  ]) {
    expect(definitionByName.get(name)).toContain('>= (0)::numeric');
    expect(definitionByName.get(name)).toContain('18446744073709551615');
  }
  expect(definitionByName.get('ck_announcement_changes_kind_action')).toMatch(
    /kind.*UPSERT.*action.*PUBLISHED.*UPDATED.*kind.*TOMBSTONE.*action.*WITHDRAWN.*ARCHIVED/,
  );
  expect(definitionByName.get('ck_announcement_changes_payload')).toMatch(
    /kind.*UPSERT.*title IS NOT NULL.*body IS NOT NULL.*published_at IS NOT NULL.*kind.*TOMBSTONE.*title IS NULL.*body IS NULL.*published_at IS NULL.*author_display_name IS NULL/,
  );
  const index = await queryOne(
    database,
    `SELECT pg_get_indexdef('idx_announcement_changes_announcement_position'::regclass) AS definition`,
  );
  expect(index.definition).toBe(
    'CREATE INDEX idx_announcement_changes_announcement_position ON public.announcement_changes USING btree (announcement_id, "position" DESC)',
  );
}

async function expectRuntimeConstraints(database: DataSource) {
  await expectConstraintViolation(
    database.query(
      'INSERT INTO announcement_change_clock (id, value) VALUES (2, 0)',
    ),
  );
  await expectConstraintViolation(
    database.query(
      'UPDATE announcement_change_clock SET value = -1 WHERE id = 1',
    ),
  );
  await expectConstraintViolation(
    database.query(
      'UPDATE announcement_change_clock SET value = 18446744073709551616 WHERE id = 1',
    ),
  );
  await expectConstraintViolation(
    database.query(changeInsert(['-1', publishedEarlierId])),
  );
  await expectConstraintViolation(
    database.query(changeInsert(['18446744073709551616', publishedEarlierId])),
  );
  await expectConstraintViolation(
    database.query(
      changeInsert(['3', publishedEarlierId, 'UPSERT', 'WITHDRAWN']),
    ),
  );
  await expectConstraintViolation(
    database.query(
      changeInsert(['4', publishedEarlierId, 'UPSERT', 'PUBLISHED', null]),
    ),
  );
  await expectConstraintViolation(
    database.query(
      changeInsert([
        '5',
        publishedEarlierId,
        'TOMBSTONE',
        'ARCHIVED',
        null,
        'A forbidden tombstone body',
        null,
        null,
      ]),
    ),
  );
}

function changeInsert(values: Array<string | null>) {
  const [
    position,
    announcementId,
    kind = 'UPSERT',
    action = 'PUBLISHED',
    title = 'Valid event title',
    body = 'Valid event body',
    publishedAt = '2026-01-01T00:00:00.000Z',
    authorDisplayName = 'First Author',
    occurredAt = '2026-01-01T00:00:00.000Z',
  ] = values;
  return `INSERT INTO announcement_changes (position, announcement_id, kind, action, title, body, published_at, author_display_name, occurred_at) VALUES ('${position}', '${announcementId}', '${kind}', '${action}', ${sqlValue(title)}, ${sqlValue(body)}, ${sqlValue(publishedAt)}, ${sqlValue(authorDisplayName)}, ${sqlValue(occurredAt)})`;
}

function sqlValue(value: string | null) {
  return value === null ? 'NULL' : `'${value}'`;
}

async function expectConstraintViolation(query: Promise<unknown>) {
  await expect(query).rejects.toMatchObject({ code: '23514' });
}

async function queryRows(
  database: DataSource,
  sql: string,
): Promise<unknown[]> {
  const result: unknown = await database.query(sql);
  if (!Array.isArray(result)) throw new Error('Expected PostgreSQL query rows');
  const rows: unknown[] = [];
  for (const row of result) rows.push(row);
  return rows;
}

async function queryOne(
  database: DataSource,
  sql: string,
): Promise<Record<string, unknown>> {
  const [row] = await queryRows(database, sql);
  if (!row || typeof row !== 'object')
    throw new Error('Expected PostgreSQL row');
  return row as Record<string, unknown>;
}
