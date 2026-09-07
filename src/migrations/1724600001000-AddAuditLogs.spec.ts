import { AddAuditLogs1724600001000 } from './1724600001000-AddAuditLogs';

describe('AddAuditLogs1724600001000', () => {
  it('defines reversible Phase 0 audit and publication state changes', async () => {
    const upQueries: string[] = [];
    const downQueries: string[] = [];
    const migration = new AddAuditLogs1724600001000();

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

    const upSql = upQueries.join('\n');
    expect(upSql).toContain('CREATE TABLE "audit_logs"');
    expect(upSql).toContain('CREATE TYPE "announcement_status"');
    expect(upSql).toContain(
      'ADD COLUMN "status" "announcement_status" NOT NULL',
    );
    expect(upSql).toContain('CREATE TYPE "ticket_priority"');
    expect(upSql).toContain('ADD COLUMN "priority" "ticket_priority" NOT NULL');
    expect(upSql).toContain(
      'ADD COLUMN "author_user_id" uuid REFERENCES "users"("id")',
    );
    expect(upSql).toContain('ALTER TABLE "access_events"');
    expect(upSql).toContain('ADD COLUMN "resident_id" uuid');
    expect(upSql).toContain('ADD COLUMN "unit_id" uuid');
    expect(upSql).toContain(
      'ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now()',
    );
    expect(downQueries.join('\n')).toContain(
      'DROP TYPE IF EXISTS "announcement_status"',
    );
  });
});
