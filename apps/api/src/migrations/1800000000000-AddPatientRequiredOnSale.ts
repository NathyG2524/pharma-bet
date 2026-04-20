import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPatientRequiredOnSale1800000000000 implements MigrationInterface {
  name = "AddPatientRequiredOnSale1800000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "medicines" ADD "requiresPatient" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "medicines" DROP COLUMN "requiresPatient"`);
  }
}
