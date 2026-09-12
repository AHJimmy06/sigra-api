import { HardenResidentIdentity1724600006000 } from './1724600006000-HardenResidentIdentity';

describe('HardenResidentIdentity1724600006000', () => {
  it('preflights normalized email collisions before canonicalization and index creation', async () => {
    const queries: string[] = [];
    const migration = new HardenResidentIdentity1724600006000();

    await migration.up({
      query: async (sql: string) => {
        queries.push(sql);
        return [];
      },
    } as never);

    expect(queries[0]).toContain('lower(btrim("email"))');
    expect(queries[0]).toContain('HAVING COUNT(*) > 1');
    expect(queries[1]).toBe(
      'UPDATE "users" SET "email" = lower(btrim("email"))',
    );
    expect(queries[2]).toContain('DROP CONSTRAINT IF EXISTS "users_email_key"');
    expect(queries[3]).toContain(
      'CREATE UNIQUE INDEX "uq_users_email_normalized"',
    );
  });

  it('reports colliding email values before making schema changes', async () => {
    const queries: string[] = [];
    const migration = new HardenResidentIdentity1724600006000();

    await expect(
      migration.up({
        query: async (sql: string) => {
          queries.push(sql);
          return [
            {
              normalized_email: 'person@example.com',
              user_ids: ['user-1', 'user-2'],
              emails: [' Person@example.com ', 'person@example.com'],
            },
          ];
        },
      } as never),
    ).rejects.toThrow(
      'Normalized user-email collisions: person@example.com (users: user-1, user-2; emails:  Person@example.com , person@example.com)',
    );
    expect(queries).toHaveLength(1);
  });

  it('restores raw email uniqueness on rollback', async () => {
    const queries: string[] = [];
    const migration = new HardenResidentIdentity1724600006000();

    await migration.down({
      query: async (sql: string) => {
        queries.push(sql);
      },
    } as never);

    expect(queries).toEqual([
      'DROP INDEX IF EXISTS "uq_users_email_normalized"',
      'ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email")',
    ]);
  });
});
