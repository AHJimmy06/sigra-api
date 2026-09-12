import { AddUnitArchiveMetadata1724600007000 } from './1724600007000-AddUnitArchiveMetadata';

describe('AddUnitArchiveMetadata1724600007000', () => {
  it('adds reversible unit archive metadata, actor reference, and archive index', async () => {
    const queries: string[] = [];
    const migration = new AddUnitArchiveMetadata1724600007000();

    await migration.up({ query: async (sql: string) => queries.push(sql) } as never);

    expect(queries.join('\n')).toContain('"archived_at" timestamptz');
    expect(queries.join('\n')).toContain('"archived_by_user_id" uuid');
    expect(queries.join('\n')).toContain('ON DELETE SET NULL');
    expect(queries.join('\n')).toContain('idx_units_archived_at');
  });

  it('removes only archive metadata and its supporting schema on rollback', async () => {
    const queries: string[] = [];
    const migration = new AddUnitArchiveMetadata1724600007000();

    await migration.down({ query: async (sql: string) => queries.push(sql) } as never);

    expect(queries.join('\n')).toContain('DROP INDEX IF EXISTS "idx_units_archived_at"');
    expect(queries.join('\n')).toContain('DROP COLUMN "archived_at"');
    expect(queries.join('\n')).toContain('DROP COLUMN "archived_by_user_id"');
  });
});
