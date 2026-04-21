import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlatformAdminFlag1840000000000 implements MigrationInterface {
  name = "AddPlatformAdminFlag1840000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "platformAdmin" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "platformAdmin"`);
  }
}
