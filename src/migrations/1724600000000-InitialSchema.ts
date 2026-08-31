import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1724600000000 implements MigrationInterface {
  name = 'InitialSchema1724600000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(
      `CREATE TYPE "user_role" AS ENUM ('ADMIN','GUARD','RESIDENT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "access_decision" AS ENUM ('ALLOWED','DENIED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "access_direction" AS ENUM ('ENTRY','EXIT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "ticket_status" AS ENUM ('OPEN','IN_PROGRESS','RESOLVED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "units" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "code" varchar NOT NULL UNIQUE, "address" varchar NOT NULL, "parking_spaces" integer NOT NULL DEFAULT 0 CHECK ("parking_spaces" >= 0), "active" boolean NOT NULL DEFAULT true, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE "residents" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar NOT NULL, "phone" varchar, "active" boolean NOT NULL DEFAULT true, "unit_id" uuid NOT NULL REFERENCES "units"("id") ON DELETE RESTRICT, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "email" varchar NOT NULL UNIQUE, "password_hash" varchar NOT NULL, "role" "user_role" NOT NULL, "active" boolean NOT NULL DEFAULT true, "resident_id" uuid REFERENCES "residents"("id") ON DELETE SET NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE "access_passes" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "resident_id" uuid NOT NULL REFERENCES "residents"("id") ON DELETE CASCADE, "encrypted_secret" text NOT NULL, "valid_until" timestamptz NOT NULL, "revoked_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE "access_events" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "client_event_id" uuid NOT NULL UNIQUE, "pass_id" uuid REFERENCES "access_passes"("id") ON DELETE SET NULL, "guard_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT, "decision" "access_decision" NOT NULL, "direction" "access_direction" NOT NULL, "reason" varchar NOT NULL, "occurred_at" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE "announcements" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "title" varchar(160) NOT NULL, "body" text NOT NULL, "published_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE "maintenance_tickets" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "client_request_id" uuid NOT NULL UNIQUE, "resident_id" uuid NOT NULL REFERENCES "residents"("id") ON DELETE RESTRICT, "description" text NOT NULL, "image_name" varchar NOT NULL, "status" "ticket_status" NOT NULL DEFAULT 'OPEN', "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_access_events_occurred_at" ON "access_events" ("occurred_at")`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "maintenance_tickets", "announcements", "access_events", "access_passes", "users", "residents", "units" CASCADE`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "ticket_status", "access_direction", "access_decision", "user_role"`,
    );
  }
}
