import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnnouncementAuthorSchema1724600009000 implements MigrationInterface {
  name = 'AddAnnouncementAuthorSchema1724600009000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "display_name" varchar(120)`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "display_name" = btrim("residents"."name") FROM "residents" WHERE "residents"."id" = "users"."resident_id" AND char_length(btrim("residents"."name")) BETWEEN 1 AND 120`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD COLUMN "author_id_snapshot" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD COLUMN "author_display_name_snapshot" varchar(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD COLUMN "author_email_snapshot" varchar`,
    );
    await queryRunner.query(
      `UPDATE "announcements" SET "author_id_snapshot" = "users"."id", "author_display_name_snapshot" = "users"."display_name", "author_email_snapshot" = lower(btrim("users"."email")) FROM "users" WHERE "users"."id" = "announcements"."author_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "ck_users_display_name_valid" CHECK ("display_name" IS NULL OR ("display_name" = btrim("display_name") AND char_length("display_name") BETWEEN 1 AND 120))`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD CONSTRAINT "ck_announcements_author_snapshot" CHECK (("author_id_snapshot" IS NULL AND "author_display_name_snapshot" IS NULL AND "author_email_snapshot" IS NULL) OR ("author_id_snapshot" IS NOT NULL AND "author_email_snapshot" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD CONSTRAINT "ck_announcements_live_author_matches_snapshot" CHECK ("author_user_id" IS NULL OR "author_user_id" = "author_id_snapshot")`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD CONSTRAINT "ck_announcements_published_at" CHECK ("status" <> 'PUBLISHED' OR "published_at" IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_announcements_admin_status_updated_id" ON "announcements" ("status", "updated_at" DESC, "id" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_announcements_author_user_id" ON "announcements" ("author_user_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "idx_announcements_author_user_id"');
    await queryRunner.query(
      'DROP INDEX "idx_announcements_admin_status_updated_id"',
    );
    await queryRunner.query(
      'ALTER TABLE "announcements" DROP CONSTRAINT "ck_announcements_published_at"',
    );
    await queryRunner.query(
      'ALTER TABLE "announcements" DROP CONSTRAINT "ck_announcements_live_author_matches_snapshot"',
    );
    await queryRunner.query(
      'ALTER TABLE "announcements" DROP CONSTRAINT "ck_announcements_author_snapshot"',
    );
    await queryRunner.query(
      'ALTER TABLE "users" DROP CONSTRAINT "ck_users_display_name_valid"',
    );
    await queryRunner.query(
      'ALTER TABLE "announcements" DROP COLUMN "author_email_snapshot"',
    );
    await queryRunner.query(
      'ALTER TABLE "announcements" DROP COLUMN "author_display_name_snapshot"',
    );
    await queryRunner.query(
      'ALTER TABLE "announcements" DROP COLUMN "author_id_snapshot"',
    );
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "display_name"');
  }
}
