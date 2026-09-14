import { AddAnnouncementChangeFeed1724600010000 } from './1724600010000-AddAnnouncementChangeFeed';

describe('AddAnnouncementChangeFeed1724600010000', () => {
  it('creates a singleton uint64 clock before change rows and removes only those objects in reverse order', async () => {
    const queries: string[] = [];
    const migration = new AddAnnouncementChangeFeed1724600010000();
    await migration.up({
      query: jest.fn((sql: string) => queries.push(sql)),
    } as never);

    expect(queries.join('\n')).toContain(
      'CREATE TABLE "announcement_change_clock"',
    );
    expect(queries.join('\n')).toContain('numeric(20,0)');
    expect(queries.join('\n')).toContain(
      'INSERT INTO "announcement_change_clock" ("id", "value") VALUES (1, 0)',
    );
    expect(queries.join('\n')).toContain(
      'ORDER BY "published_at", "created_at", "id"',
    );

    const down: string[] = [];
    await migration.down({
      query: jest.fn((sql: string) => down.push(sql)),
    } as never);
    expect(down).toEqual([
      'DROP INDEX "idx_announcement_changes_announcement_position"',
      'DROP TABLE "announcement_changes"',
      'DROP TABLE "announcement_change_clock"',
    ]);
  });
});
