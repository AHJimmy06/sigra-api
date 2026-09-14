import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnnouncementChangeFeed1724600010000 implements MigrationInterface {
  name = 'AddAnnouncementChangeFeed1724600010000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "announcement_change_clock" ("id" smallint PRIMARY KEY, "value" numeric(20,0) NOT NULL, CONSTRAINT "ck_announcement_change_clock_singleton" CHECK ("id" = 1), CONSTRAINT "ck_announcement_change_clock_uint64" CHECK ("value" >= 0 AND "value" <= 18446744073709551615))`,
    );
    await queryRunner.query(
      `CREATE TABLE "announcement_changes" ("position" numeric(20,0) PRIMARY KEY, "announcement_id" uuid NOT NULL, "kind" varchar NOT NULL, "action" varchar NOT NULL, "title" text, "body" text, "published_at" timestamptz, "author_display_name" varchar(120), "occurred_at" timestamptz NOT NULL, CONSTRAINT "fk_announcement_changes_announcement" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE RESTRICT, CONSTRAINT "ck_announcement_changes_position_uint64" CHECK ("position" >= 0 AND "position" <= 18446744073709551615), CONSTRAINT "ck_announcement_changes_kind_action" CHECK (("kind" = 'UPSERT' AND "action" IN ('PUBLISHED', 'UPDATED')) OR ("kind" = 'TOMBSTONE' AND "action" IN ('WITHDRAWN', 'ARCHIVED'))), CONSTRAINT "ck_announcement_changes_payload" CHECK (("kind" = 'UPSERT' AND "title" IS NOT NULL AND "body" IS NOT NULL AND "published_at" IS NOT NULL) OR ("kind" = 'TOMBSTONE' AND "title" IS NULL AND "body" IS NULL AND "published_at" IS NULL AND "author_display_name" IS NULL)))`,
    );
    await queryRunner.query(
      'INSERT INTO "announcement_change_clock" ("id", "value") VALUES (1, 0)',
    );
    await queryRunner.query(
      `INSERT INTO "announcement_changes" ("position", "announcement_id", "kind", "action", "title", "body", "published_at", "author_display_name", "occurred_at") SELECT row_number() OVER (ORDER BY "published_at", "created_at", "id"), "id", 'UPSERT', 'PUBLISHED', "title", "body", "published_at", "author_display_name_snapshot", "published_at" FROM "announcements" WHERE "status" = 'PUBLISHED'`,
    );
    await queryRunner.query(
      `UPDATE "announcement_change_clock" SET "value" = COALESCE((SELECT MAX("position") FROM "announcement_changes"), 0) WHERE "id" = 1`,
    );
    await queryRunner.query(
      'CREATE INDEX "idx_announcement_changes_announcement_position" ON "announcement_changes" ("announcement_id", "position" DESC)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "idx_announcement_changes_announcement_position"',
    );
    await queryRunner.query('DROP TABLE "announcement_changes"');
    await queryRunner.query('DROP TABLE "announcement_change_clock"');
  }
}
