import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddVisitorName1724600012000 implements MigrationInterface {
  name = 'AddVisitorName1724600012000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "access_events" ADD COLUMN "visitor_name" varchar(120)`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "access_events" DROP COLUMN "visitor_name"`,
    );
  }
}
