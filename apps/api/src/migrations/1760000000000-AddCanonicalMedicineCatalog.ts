import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCanonicalMedicineCatalog1760000000000 implements MigrationInterface {
  name = "AddCanonicalMedicineCatalog1760000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "medicine_transactions" DROP CONSTRAINT "FK_medicine_transactions_medicine"`,
    );
    await queryRunner.query(`ALTER TABLE "medicines" RENAME TO "medicine_overlays"`);
    await queryRunner.query(`DROP INDEX "UQ_medicines_tenant_branch_name"`);
    await queryRunner.query(`DROP INDEX "IDX_medicines_tenant_branch"`);

    await queryRunner.query(`
      CREATE TABLE "medicines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "sku" character varying,
        "unit" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_medicines" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_medicines_tenant_name" ON "medicines" ("tenantId", "name")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_medicines_tenant" ON "medicines" ("tenantId")`);
    await queryRunner.query(`
      INSERT INTO "medicines" ("id", "tenantId", "name", "sku", "unit", "isActive", "createdAt", "updatedAt")
      SELECT DISTINCT ON ("tenantId", "name")
        uuid_generate_v4(),
        "tenantId",
        "name",
        "sku",
        "unit",
        "isActive",
        now(),
        now()
      FROM "medicine_overlays"
      ORDER BY "tenantId", "name", "createdAt" ASC
    `);

    await queryRunner.query(`ALTER TABLE "medicine_overlays" ADD "medicineId" uuid`);
    await queryRunner.query(`
      UPDATE "medicine_overlays" mo
      SET "medicineId" = m.id
      FROM "medicines" m
      WHERE mo."tenantId" = m."tenantId" AND mo."name" = m."name"
    `);
    await queryRunner.query(
      `ALTER TABLE "medicine_overlays" ALTER COLUMN "medicineId" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "medicine_overlays" ADD "reorderMin" integer`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" ADD "reorderMax" integer`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" ADD "binLocation" character varying`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" ADD "localPrice" numeric(14,4)`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" ADD "localCost" numeric(14,4)`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" DROP COLUMN "name"`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" DROP COLUMN "sku"`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" DROP COLUMN "unit"`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" DROP COLUMN "isActive"`);

    await queryRunner.query(`
      UPDATE "medicine_transactions" t
      SET "medicineId" = o."medicineId"
      FROM "medicine_overlays" o
      WHERE t."medicineId" = o."id"
    `);
    await queryRunner.query(`
      ALTER TABLE "medicine_transactions"
      ADD CONSTRAINT "FK_medicine_transactions_medicine"
      FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_medicine_overlays_tenant_branch_medicine" ON "medicine_overlays" ("tenantId", "branchId", "medicineId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_medicine_overlays_tenant_branch" ON "medicine_overlays" ("tenantId", "branchId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "medicine_overlays"
       ADD CONSTRAINT "FK_medicine_overlays_medicine" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "medicine_overlays" DROP CONSTRAINT "FK_medicine_overlays_medicine"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_medicine_overlays_tenant_branch"`);
    await queryRunner.query(`DROP INDEX "UQ_medicine_overlays_tenant_branch_medicine"`);
    await queryRunner.query(
      `ALTER TABLE "medicine_transactions" DROP CONSTRAINT "FK_medicine_transactions_medicine"`,
    );
    await queryRunner.query(`ALTER TABLE "medicine_overlays" ADD "name" character varying`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" ADD "sku" character varying`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" ADD "unit" character varying`);
    await queryRunner.query(
      `ALTER TABLE "medicine_overlays" ADD "isActive" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(`
      UPDATE "medicine_overlays" o
      SET "name" = m."name",
          "sku" = m."sku",
          "unit" = m."unit",
          "isActive" = m."isActive"
      FROM "medicines" m
      WHERE o."medicineId" = m."id"
    `);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" ALTER COLUMN "name" SET NOT NULL`);
    await queryRunner.query(`
      UPDATE "medicine_transactions" t
      SET "medicineId" = o."id"
      FROM "medicine_overlays" o
      WHERE t."medicineId" = o."medicineId" AND t."branchId" = o."branchId"
    `);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" DROP COLUMN "localCost"`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" DROP COLUMN "localPrice"`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" DROP COLUMN "binLocation"`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" DROP COLUMN "reorderMax"`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" DROP COLUMN "reorderMin"`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" DROP COLUMN "medicineId"`);
    await queryRunner.query(`DROP INDEX "IDX_medicines_tenant"`);
    await queryRunner.query(`DROP INDEX "UQ_medicines_tenant_name"`);
    await queryRunner.query(`DROP TABLE "medicines"`);
    await queryRunner.query(`ALTER TABLE "medicine_overlays" RENAME TO "medicines"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_medicines_tenant_branch_name" ON "medicines" ("tenantId", "branchId", "name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_medicines_tenant_branch" ON "medicines" ("tenantId", "branchId")`,
    );
    await queryRunner.query(`
      ALTER TABLE "medicine_transactions"
      ADD CONSTRAINT "FK_medicine_transactions_medicine"
      FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE
    `);
  }
}
