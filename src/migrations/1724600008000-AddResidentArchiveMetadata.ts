import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResidentArchiveMetadata1724600008000 implements MigrationInterface {
  name = 'AddResidentArchiveMetadata1724600008000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "residents" ADD COLUMN "archived_at" timestamptz');
    await queryRunner.query('ALTER TABLE "residents" ADD COLUMN "archived_by_user_id" uuid');
    await queryRunner.query(
      'ALTER TABLE "residents" ADD CONSTRAINT "fk_residents_archived_by_user" FOREIGN KEY ("archived_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL',
    );
    await queryRunner.query('CREATE INDEX "idx_residents_archived_at" ON "residents" ("archived_at")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_residents_archived_at"');
    await queryRunner.query('ALTER TABLE "residents" DROP CONSTRAINT "fk_residents_archived_by_user"');
    await queryRunner.query('ALTER TABLE "residents" DROP COLUMN "archived_at"');
    await queryRunner.query('ALTER TABLE "residents" DROP COLUMN "archived_by_user_id"');
  }
}
