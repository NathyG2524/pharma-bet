import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddDraftProducts1770000000000 implements MigrationInterface {
  name = "AddDraftProducts1770000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "medicine_status_enum" AS ENUM ('canonical', 'draft')`);
    await queryRunner.query(
      `ALTER TABLE "medicines" ADD "status" "medicine_status_enum" NOT NULL DEFAULT 'canonical'`,
    );
    await queryRunner.query(`ALTER TABLE "medicines" ADD "draftBranchId" uuid`);
    await queryRunner.query(`ALTER TABLE "medicines" ADD "barcode" character varying`);
    await queryRunner.query(
      `CREATE INDEX "IDX_medicines_tenant_status" ON "medicines" ("tenantId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_medicines_draft_branch" ON "medicines" ("tenantId", "draftBranchId") WHERE "status" = 'draft'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_medicines_draft_branch"`);
    await queryRunner.query(`DROP INDEX "IDX_medicines_tenant_status"`);
    await queryRunner.query(`ALTER TABLE "medicines" DROP COLUMN "barcode"`);
    await queryRunner.query(`ALTER TABLE "medicines" DROP COLUMN "draftBranchId"`);
    await queryRunner.query(`ALTER TABLE "medicines" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "medicine_status_enum"`);
  }
}
