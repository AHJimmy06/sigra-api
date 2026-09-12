import { AddResidentArchiveMetadata1724600008000 } from './1724600008000-AddResidentArchiveMetadata';

describe('AddResidentArchiveMetadata1724600008000', () => {
  it('adds only reversible resident archive metadata, actor reference, and archive index', async () => {
    const queries: string[] = [];

    await new AddResidentArchiveMetadata1724600008000().up({
      query: async (sql: string) => queries.push(sql),
    } as never);

    expect(queries.join('\n')).toContain('ALTER TABLE "residents" ADD COLUMN "archived_at" timestamptz');
    expect(queries.join('\n')).toContain('ALTER TABLE "residents" ADD COLUMN "archived_by_user_id" uuid');
    expect(queries.join('\n')).toContain('fk_residents_archived_by_user');
    expect(queries.join('\n')).toContain('ON DELETE SET NULL');
    expect(queries.join('\n')).toContain('idx_residents_archived_at');
  });

  it('removes only resident archive schema on rollback', async () => {
    const queries: string[] = [];

    await new AddResidentArchiveMetadata1724600008000().down({
      query: async (sql: string) => queries.push(sql),
    } as never);

    expect(queries.join('\n')).toContain('DROP INDEX IF EXISTS "idx_residents_archived_at"');
    expect(queries.join('\n')).toContain('DROP CONSTRAINT "fk_residents_archived_by_user"');
    expect(queries.join('\n')).toContain('DROP COLUMN "archived_at"');
    expect(queries.join('\n')).toContain('DROP COLUMN "archived_by_user_id"');
  });
});
