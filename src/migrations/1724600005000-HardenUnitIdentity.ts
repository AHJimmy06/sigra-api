import { MigrationInterface, QueryRunner } from 'typeorm';

type NormalizedCollision = {
  normalized_code: string;
  unit_ids: string[];
  codes: string[];
};

export class HardenUnitIdentity1724600005000 implements MigrationInterface {
  name = 'HardenUnitIdentity1724600005000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const collisions = (await queryRunner.query(`
      SELECT lower(btrim("code")) AS normalized_code,
             array_agg("id"::text ORDER BY "id") AS unit_ids,
             array_agg("code" ORDER BY "id") AS codes
      FROM "units"
      GROUP BY lower(btrim("code"))
      HAVING COUNT(*) > 1
      ORDER BY normalized_code
    `)) as NormalizedCollision[];

    if (collisions.length > 0) {
      throw new Error(
        `Normalized unit-code collisions: ${collisions
          .map(
            ({ normalized_code, unit_ids, codes }) =>
              `${normalized_code} (units: ${unit_ids.join(', ')}; codes: ${codes.join(', ')})`,
          )
          .join('; ')}`,
      );
    }

    await queryRunner.query(
      'UPDATE "units" SET "code" = lower(btrim("code"))',
    );
    await queryRunner.query(
      'ALTER TABLE "units" DROP CONSTRAINT IF EXISTS "units_code_key"',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_units_code_normalized" ON "units" (lower(btrim("code")))',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "uq_units_code_normalized"');
    await queryRunner.query(
      'ALTER TABLE "units" ADD CONSTRAINT "units_code_key" UNIQUE ("code")',
    );
  }
}
