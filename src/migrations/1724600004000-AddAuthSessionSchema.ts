import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthSessionSchema1724600004000 implements MigrationInterface {
  name = 'AddAuthSessionSchema1724600004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "auth_sessions" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "current_refresh_digest" bytea NOT NULL, "current_digest_key_version" varchar(32) NOT NULL, "current_generation" integer NOT NULL, "current_derivation_key_version" varchar(32) NOT NULL, "absolute_expires_at" timestamptz NOT NULL, "revoked_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "fk_auth_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE, CONSTRAINT "ck_auth_sessions_current_refresh_digest_length" CHECK (octet_length("current_refresh_digest") = 32), CONSTRAINT "ck_auth_sessions_current_generation_nonnegative" CHECK ("current_generation" >= 0), CONSTRAINT "ck_auth_sessions_current_digest_key_version_format" CHECK ("current_digest_key_version" COLLATE "C" ~ '^[A-Za-z0-9._-]{1,32}$'), CONSTRAINT "ck_auth_sessions_current_derivation_key_version_format" CHECK ("current_derivation_key_version" COLLATE "C" ~ '^[A-Za-z0-9._-]{1,32}$'))`,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_operations" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "session_id" uuid NOT NULL, "operation_id" uuid NOT NULL, "presented_digest" bytea NOT NULL, "presented_digest_key_version" varchar(32) NOT NULL, "result_generation" integer NOT NULL, "result_digest_key_version" varchar(32) NOT NULL, "result_derivation_key_version" varchar(32) NOT NULL, "expires_at" timestamptz NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "fk_refresh_operations_session" FOREIGN KEY ("session_id") REFERENCES "auth_sessions"("id") ON DELETE CASCADE, CONSTRAINT "ck_refresh_operations_presented_digest_length" CHECK (octet_length("presented_digest") = 32), CONSTRAINT "ck_refresh_operations_result_generation_nonnegative" CHECK ("result_generation" >= 0), CONSTRAINT "ck_refresh_operations_presented_digest_key_version_format" CHECK ("presented_digest_key_version" COLLATE "C" ~ '^[A-Za-z0-9._-]{1,32}$'), CONSTRAINT "ck_refresh_operations_result_digest_key_version_format" CHECK ("result_digest_key_version" COLLATE "C" ~ '^[A-Za-z0-9._-]{1,32}$'), CONSTRAINT "ck_refresh_operations_result_derivation_key_version_format" CHECK ("result_derivation_key_version" COLLATE "C" ~ '^[A-Za-z0-9._-]{1,32}$'))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_auth_sessions_current_refresh_digest" ON "auth_sessions" ("current_refresh_digest")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_sessions_user_revocation" ON "auth_sessions" ("user_id", "revoked_at", "absolute_expires_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_sessions_cleanup" ON "auth_sessions" ("absolute_expires_at", "id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_refresh_operations_session_operation" ON "refresh_operations" ("session_id", "operation_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_operations_presented_digest" ON "refresh_operations" ("presented_digest")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_operations_cleanup" ON "refresh_operations" ("expires_at", "id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "refresh_operations"');
    await queryRunner.query('DROP TABLE "auth_sessions"');
  }
}
