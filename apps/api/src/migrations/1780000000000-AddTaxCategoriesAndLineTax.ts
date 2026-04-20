import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaxCategoriesAndLineTax1780000000000 implements MigrationInterface {
  name = "AddTaxCategoriesAndLineTax1780000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tax_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "rate" numeric(6,4) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tax_categories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tax_categories_tenant_name" UNIQUE ("tenantId", "name"),
        CONSTRAINT "FK_tax_categories_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "branch_tax_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "defaultTaxCategoryId" uuid,
        "taxRateOverride" numeric(6,4),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_branch_tax_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_branch_tax_settings_branch" UNIQUE ("branchId"),
        CONSTRAINT "FK_branch_tax_settings_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_branch_tax_settings_category" FOREIGN KEY ("defaultTaxCategoryId") REFERENCES "tax_categories"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_branch_tax_settings_tenant" ON "branch_tax_settings" ("tenantId")`,
    );
    await queryRunner.query(`ALTER TABLE "medicines" ADD "taxCategoryId" uuid`);
    await queryRunner.query(`
      ALTER TABLE "medicines"
      ADD CONSTRAINT "FK_medicines_taxCategory"
      FOREIGN KEY ("taxCategoryId") REFERENCES "tax_categories"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`ALTER TABLE "medicine_transactions" ADD "taxBase" numeric(14,4)`);
    await queryRunner.query(`ALTER TABLE "medicine_transactions" ADD "taxRate" numeric(6,4)`);
    await queryRunner.query(`ALTER TABLE "medicine_transactions" ADD "taxAmount" numeric(14,4)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "medicine_transactions" DROP COLUMN "taxAmount"`);
    await queryRunner.query(`ALTER TABLE "medicine_transactions" DROP COLUMN "taxRate"`);
    await queryRunner.query(`ALTER TABLE "medicine_transactions" DROP COLUMN "taxBase"`);
    await queryRunner.query(`ALTER TABLE "medicines" DROP CONSTRAINT "FK_medicines_taxCategory"`);
    await queryRunner.query(`ALTER TABLE "medicines" DROP COLUMN "taxCategoryId"`);
    await queryRunner.query(`DROP INDEX "IDX_branch_tax_settings_tenant"`);
    await queryRunner.query(`DROP TABLE "branch_tax_settings"`);
    await queryRunner.query(`DROP TABLE "tax_categories"`);
  }
}
