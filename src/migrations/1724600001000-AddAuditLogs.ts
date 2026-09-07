import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogs1724600001000 implements MigrationInterface {
  name = 'AddAuditLogs1724600001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    await queryRunner.query(
      `CREATE TYPE "ticket_priority" AS ENUM ('LOW','MEDIUM','HIGH','URGENT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "announcement_status" AS ENUM ('DRAFT','PUBLISHED','ARCHIVED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_tickets" ADD COLUMN "priority" "ticket_priority" NOT NULL DEFAULT 'MEDIUM'`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("audit_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "actor_user_id" uuid REFERENCES "users"("id") ON DELETE RESTRICT, "actor_role" "user_role", "action" varchar NOT NULL, "resource_type" varchar NOT NULL, "resource_id" uuid, "metadata" jsonb NOT NULL DEFAULT '{}', "ip" varchar, "created_at" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD COLUMN "author_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD COLUMN "status" "announcement_status" NOT NULL DEFAULT 'DRAFT'`,
    );
    await queryRunner.query(
      `UPDATE "announcements" SET "status" = 'PUBLISHED' WHERE "published_at" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "access_events" ADD COLUMN "resident_id" uuid REFERENCES "residents"("id") ON DELETE SET NULL, ADD COLUMN "unit_id" uuid REFERENCES "units"("id") ON DELETE SET NULL, ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_resource" ON "audit_logs" ("resource_type", "resource_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_units_search" ON "units" USING gin (("code" || ' ' || "address") gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_units_active_created" ON "units" ("active", "created_at", "id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_residents_search" ON "residents" USING gin ("name" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_residents_filters" ON "residents" ("active", "unit_id", "created_at", "id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_email_search" ON "users" USING gin ("email" gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_announcements_search" ON "announcements" USING gin (("title" || ' ' || "body") gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_announcements_published_created" ON "announcements" ("published_at", "created_at", "id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tickets_filters" ON "maintenance_tickets" ("status", "priority", "created_at", "id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tickets_search" ON "maintenance_tickets" USING gin ("description" gin_trgm_ops)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tickets_search"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tickets_filters"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_announcements_published_created"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_announcements_search"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_email_search"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_residents_filters"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_residents_search"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_units_active_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_units_search"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(
      `ALTER TABLE "access_events" DROP COLUMN IF EXISTS "created_at", DROP COLUMN IF EXISTS "unit_id", DROP COLUMN IF EXISTS "resident_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" DROP COLUMN IF EXISTS "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" DROP COLUMN IF EXISTS "author_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_tickets" DROP COLUMN IF EXISTS "priority"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "ticket_priority"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "announcement_status"`);
  }
}
