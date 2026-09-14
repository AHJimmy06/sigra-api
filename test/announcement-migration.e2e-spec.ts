import { DataSource, type MigrationInterface } from 'typeorm';
import dataSource from '../src/config/typeorm.datasource';
import { AddAnnouncementAuthorSchema1724600009000 } from '../src/migrations/1724600009000-AddAnnouncementAuthorSchema';
import { startDisposablePostgres } from './support/disposable-postgres';

jest.setTimeout(120_000);

const authorId = '11111111-1111-4111-8111-111111111111';
const residentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const unitId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const authoredAnnouncementId = '22222222-2222-4222-8222-222222222222';
const authorlessAnnouncementId = '33333333-3333-4333-8333-333333333333';

describe('announcement author schema migration', () => {
  let postgres: Awaited<ReturnType<typeof startDisposablePostgres>>;
  let database: DataSource;
  let baseline: Awaited<ReturnType<typeof captureBaseline>>;

  beforeAll(async () => {
    postgres = await startDisposablePostgres('announcement-schema');
    database = new DataSource({
      ...dataSource.options,
      ...postgres.options,
      migrations: (
        dataSource.options.migrations as Array<new () => MigrationInterface>
      ).slice(0, -2),
    });
    await database.initialize();
    await database.runMigrations();
    await seedBaseline(database);
    baseline = await captureBaseline(database);
  });

  afterAll(async () => {
    if (database?.isInitialized) await database.destroy();
    await postgres?.stop();
  });

  it('backfills snapshots, preserves 1000 ownership, and restores the 8000 baseline', async () => {
    const migration = new AddAnnouncementAuthorSchema1724600009000();
    const runner = database.createQueryRunner();
    await migration.up(runner);

    expect(
      await database.query(
        `SELECT id, author_id_snapshot, author_display_name_snapshot, author_email_snapshot FROM announcements ORDER BY id`,
      ),
    ).toEqual([
      {
        id: authoredAnnouncementId,
        author_id_snapshot: authorId,
        author_display_name_snapshot: 'Author Display Name',
        author_email_snapshot: 'author@example.test',
      },
      {
        id: authorlessAnnouncementId,
        author_id_snapshot: null,
        author_display_name_snapshot: null,
        author_email_snapshot: null,
      },
    ]);
    expect(
      await database.query(`SELECT display_name FROM users WHERE id = $1`, [
        authorId,
      ]),
    ).toEqual([{ display_name: 'Author Display Name' }]);
    await expect(
      database.query(
        `UPDATE announcements SET author_email_snapshot = NULL WHERE id = $1`,
        [authoredAnnouncementId],
      ),
    ).rejects.toThrow();
    await expect(
      database.query(
        `UPDATE users SET display_name = ' invalid ' WHERE id = $1`,
        [authorId],
      ),
    ).rejects.toThrow();
    await expect(
      database.query(
        `UPDATE announcements SET status = 'PUBLISHED' WHERE id = $1`,
        [authoredAnnouncementId],
      ),
    ).rejects.toThrow();
    expect(
      await database.query(
        `SELECT indexname FROM pg_indexes WHERE indexname IN ('idx_announcements_admin_status_updated_id', 'idx_announcements_author_user_id') ORDER BY indexname`,
      ),
    ).toEqual([
      { indexname: 'idx_announcements_admin_status_updated_id' },
      { indexname: 'idx_announcements_author_user_id' },
    ]);

    await database.query('BEGIN');
    await database.query(`DELETE FROM users WHERE id = $1`, [authorId]);
    expect(
      await database.query(
        `SELECT author_user_id, author_id_snapshot, author_display_name_snapshot, author_email_snapshot FROM announcements WHERE id = $1`,
        [authoredAnnouncementId],
      ),
    ).toEqual([
      {
        author_user_id: null,
        author_id_snapshot: authorId,
        author_display_name_snapshot: 'Author Display Name',
        author_email_snapshot: 'author@example.test',
      },
    ]);
    await database.query('ROLLBACK');

    await migration.down(runner);
    await runner.release();
    expect(await captureBaseline(database)).toEqual(baseline);

    const repeatRunner = database.createQueryRunner();
    await migration.up(repeatRunner);
    await repeatRunner.release();
    expect(
      await database.query(
        `SELECT author_id_snapshot, author_display_name_snapshot, author_email_snapshot FROM announcements WHERE id = $1`,
        [authoredAnnouncementId],
      ),
    ).toEqual([
      {
        author_id_snapshot: authorId,
        author_display_name_snapshot: 'Author Display Name',
        author_email_snapshot: 'author@example.test',
      },
    ]);
  });
});

async function seedBaseline(database: DataSource) {
  await database.query(
    `INSERT INTO units (id, code, address) VALUES ($1, 'author-unit', 'Author Street 1')`,
    [unitId],
  );
  await database.query(
    `INSERT INTO residents (id, name, unit_id) VALUES ($1, ' Author Display Name ', $2)`,
    [residentId, unitId],
  );
  await database.query(
    `INSERT INTO users (id, email, password_hash, role, resident_id) VALUES ($1, ' Author@Example.Test ', 'hash', 'ADMIN', $2)`,
    [authorId, residentId],
  );
  await database.query(
    `INSERT INTO announcements (id, title, body, author_user_id) VALUES ($1, 'Authored announcement', 'A sufficiently descriptive body', $2), ($3, 'Authorless announcement', 'A sufficiently descriptive body', NULL)`,
    [authoredAnnouncementId, authorId, authorlessAnnouncementId],
  );
}

async function captureBaseline(database: DataSource) {
  return {
    columns: await queryRows(
      database,
      `
      SELECT table_name, column_name, data_type, udt_name, is_nullable,
             column_default, character_maximum_length, ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name IN ('users', 'announcements')
      ORDER BY table_name, ordinal_position
    `,
    ),
    constraints: await queryRows(
      database,
      `
      SELECT rel.relname AS table_name, con.conname, con.contype,
             pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname IN ('users', 'announcements')
      ORDER BY rel.relname, con.conname
    `,
    ),
    indexes: await queryRows(
      database,
      `
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename IN ('users', 'announcements')
      ORDER BY tablename, indexname
    `,
    ),
    ownership: await queryRows(
      database,
      `
      SELECT typ.typname, enum.enumlabel, ext.extname
      FROM pg_type typ
      LEFT JOIN pg_enum enum ON enum.enumtypid = typ.oid
      LEFT JOIN pg_extension ext ON ext.extname = 'pg_trgm'
      WHERE typ.typname = 'announcement_status'
      ORDER BY enum.enumsortorder
    `,
    ),
    announcements: await queryRows(
      database,
      `
      SELECT announcement.*, author.id AS referenced_author_id,
             author.email AS referenced_author_email
      FROM announcements announcement
      LEFT JOIN users author ON author.id = announcement.author_user_id
      ORDER BY announcement.id
    `,
    ),
  };
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
