import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSuppliersAndMappings1780000000000 implements MigrationInterface {
  name = "AddSuppliersAndMappings1780000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "suppliers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "contactEmail" character varying,
        "contactPhone" character varying,
        "address" character varying,
        "notes" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_suppliers" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_suppliers_tenant_name" ON "suppliers" ("tenantId", "name")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_suppliers_tenant" ON "suppliers" ("tenantId")`);

    await queryRunner.query(`
      CREATE TABLE "supplier_products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "supplierId" uuid NOT NULL,
        "medicineId" uuid NOT NULL,
        "supplierSku" character varying,
        "packSize" integer,
        "packUnit" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_supplier_products" PRIMARY KEY ("id"),
        CONSTRAINT "FK_supplier_products_supplier" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_supplier_products_medicine" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_supplier_products_tenant_supplier_medicine" ON "supplier_products" ("tenantId", "supplierId", "medicineId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_products_tenant_supplier" ON "supplier_products" ("tenantId", "supplierId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_products_tenant_medicine" ON "supplier_products" ("tenantId", "medicineId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_supplier_products_tenant_medicine"`);
    await queryRunner.query(`DROP INDEX "IDX_supplier_products_tenant_supplier"`);
    await queryRunner.query(`DROP INDEX "UQ_supplier_products_tenant_supplier_medicine"`);
    await queryRunner.query(`DROP TABLE "supplier_products"`);
    await queryRunner.query(`DROP INDEX "IDX_suppliers_tenant"`);
    await queryRunner.query(`DROP INDEX "UQ_suppliers_tenant_name"`);
    await queryRunner.query(`DROP TABLE "suppliers"`);
  }
}
