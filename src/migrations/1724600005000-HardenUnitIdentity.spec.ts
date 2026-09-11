import { HardenUnitIdentity1724600005000 } from './1724600005000-HardenUnitIdentity';

describe('HardenUnitIdentity1724600005000', () => {
  it('preflights normalized collisions before canonicalization and index creation', async () => {
    const queries: string[] = [];
    const migration = new HardenUnitIdentity1724600005000();

    await migration.up({
      query: async (sql: string) => {
        queries.push(sql);
        return [];
      },
    } as never);

    expect(queries[0]).toContain('lower(btrim("code"))');
    expect(queries[0]).toContain('HAVING COUNT(*) > 1');
    expect(queries[1]).toBe(
      'UPDATE "units" SET "code" = lower(btrim("code"))',
    );
    expect(queries[2]).toContain('DROP CONSTRAINT IF EXISTS "units_code_key"');
    expect(queries[3]).toContain(
      'CREATE UNIQUE INDEX "uq_units_code_normalized"',
    );
  });

  it('fails before schema changes with actionable normalized collision diagnostics', async () => {
    const queries: string[] = [];
    const migration = new HardenUnitIdentity1724600005000();

    await expect(
      migration.up({
        query: async (sql: string) => {
          queries.push(sql);
          return [
            {
              normalized_code: 'a-101',
              unit_ids: ['unit-1', 'unit-2'],
              codes: [' A-101 ', 'a-101'],
            },
          ];
        },
      } as never),
    ).rejects.toThrow(
      'Normalized unit-code collisions: a-101 (units: unit-1, unit-2; codes:  A-101 , a-101)',
    );
    expect(queries).toHaveLength(1);
  });

  it('restores the prior raw-code uniqueness constraint on rollback', async () => {
    const queries: string[] = [];
    const migration = new HardenUnitIdentity1724600005000();

    await migration.down({
      query: async (sql: string) => {
        queries.push(sql);
      },
    } as never);

    expect(queries).toEqual([
      'DROP INDEX IF EXISTS "uq_units_code_normalized"',
      'ALTER TABLE "units" ADD CONSTRAINT "units_code_key" UNIQUE ("code")',
    ]);
  });
});
