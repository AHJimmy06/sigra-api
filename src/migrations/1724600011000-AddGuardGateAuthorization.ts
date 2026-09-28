import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuardGateAuthorization1724600011000 implements MigrationInterface {
  name = 'AddGuardGateAuthorization1724600011000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "guard_gate_authorized" boolean NOT NULL DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "guard_gate_authorized"`,
    );
  }
}
