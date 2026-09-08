import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceUnitParkingLimit1724600003000 implements MigrationInterface {
  name = 'EnforceUnitParkingLimit1724600003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "units" ADD CONSTRAINT "chk_units_parking_spaces_max" CHECK ("parking_spaces" <= 1000)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "units" DROP CONSTRAINT IF EXISTS "chk_units_parking_spaces_max"`,
    );
  }
}
