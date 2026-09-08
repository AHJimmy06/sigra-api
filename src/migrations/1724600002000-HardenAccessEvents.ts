import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenAccessEvents1724600002000 implements MigrationInterface {
  name = 'HardenAccessEvents1724600002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "access_events" ADD COLUMN "request_fingerprint" varchar(64), ADD COLUMN "request_id" varchar(128)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_access_events_filters" ON "access_events" ("decision", "direction", "occurred_at" DESC, "id" DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_access_events_filters"`);
    await queryRunner.query(
      `ALTER TABLE "access_events" DROP COLUMN IF EXISTS "request_id", DROP COLUMN IF EXISTS "request_fingerprint"`,
    );
  }
}
