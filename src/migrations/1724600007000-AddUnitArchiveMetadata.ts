import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitArchiveMetadata1724600007000 implements MigrationInterface {
  name = 'AddUnitArchiveMetadata1724600007000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "units" ADD COLUMN "archived_at" timestamptz',
    );
    await queryRunner.query(
      'ALTER TABLE "units" ADD COLUMN "archived_by_user_id" uuid',
    );
    await queryRunner.query(
      'ALTER TABLE "units" ADD CONSTRAINT "fk_units_archived_by_user" FOREIGN KEY ("archived_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_units_archived_at" ON "units" ("archived_at")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_units_archived_at"');
    await queryRunner.query(
      'ALTER TABLE "units" DROP CONSTRAINT "fk_units_archived_by_user"',
    );
    await queryRunner.query('ALTER TABLE "units" DROP COLUMN "archived_at"');
    await queryRunner.query(
      'ALTER TABLE "units" DROP COLUMN "archived_by_user_id"',
    );
  }
}
