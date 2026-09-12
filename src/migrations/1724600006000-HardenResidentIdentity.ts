import { MigrationInterface, QueryRunner } from 'typeorm';

type NormalizedCollision = {
  normalized_email: string;
  user_ids: string[];
  emails: string[];
};

export class HardenResidentIdentity1724600006000 implements MigrationInterface {
  name = 'HardenResidentIdentity1724600006000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const collisions = (await queryRunner.query(`
      SELECT lower(btrim("email")) AS normalized_email,
             array_agg("id"::text ORDER BY "id") AS user_ids,
             array_agg("email" ORDER BY "id") AS emails
      FROM "users"
      GROUP BY lower(btrim("email"))
      HAVING COUNT(*) > 1
      ORDER BY normalized_email
    `)) as NormalizedCollision[];

    if (collisions.length > 0) {
      throw new Error(
        `Normalized user-email collisions: ${collisions
          .map(
            ({ normalized_email, user_ids, emails }) =>
              `${normalized_email} (users: ${user_ids.join(', ')}; emails: ${emails.join(', ')})`,
          )
          .join('; ')}`,
      );
    }

    await queryRunner.query(
      'UPDATE "users" SET "email" = lower(btrim("email"))',
    );
    await queryRunner.query(
      'ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key"',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_users_email_normalized" ON "users" (lower(btrim("email")))',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "uq_users_email_normalized"');
    await queryRunner.query(
      'ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email")',
    );
  }
}
