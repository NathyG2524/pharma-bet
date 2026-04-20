import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSalesTransactions1790000000000 implements MigrationInterface {
  name = "AddSalesTransactions1790000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sales" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "patientId" uuid,
        "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "notes" text,
        "subtotal" numeric(14,4) NOT NULL,
        "taxTotal" numeric(14,4) NOT NULL,
        "totalAmount" numeric(14,4) NOT NULL,
        "cogsTotal" numeric(14,4) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sales" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sales_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sales_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sales_patient" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_sales_tenant_branch" ON "sales" ("tenantId", "branchId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sales_tenant_recorded" ON "sales" ("tenantId", "recordedAt")`,
    );
    await queryRunner.query(`
      CREATE TABLE "sale_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "saleId" uuid NOT NULL,
        "medicineId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unitPrice" numeric(14,4) NOT NULL,
        "taxBase" numeric(14,4),
        "taxRate" numeric(6,4),
        "taxAmount" numeric(14,4),
        "lineSubtotal" numeric(14,4) NOT NULL,
        "lineTotal" numeric(14,4) NOT NULL,
        "cogsAmount" numeric(14,4) NOT NULL,
        "overrideReason" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sale_lines_sale" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sale_lines_medicine" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_sale_lines_sale" ON "sale_lines" ("saleId")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_sale_lines_medicine" ON "sale_lines" ("medicineId")`,
    );
    await queryRunner.query(`
      CREATE TABLE "sale_line_allocations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "saleLineId" uuid NOT NULL,
        "lotId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unitCost" numeric(14,4) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sale_line_allocations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sale_line_allocations_line" FOREIGN KEY ("saleLineId") REFERENCES "sale_lines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_sale_line_allocations_lot" FOREIGN KEY ("lotId") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_sale_line_allocations_line" ON "sale_line_allocations" ("saleLineId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sale_line_allocations_lot" ON "sale_line_allocations" ("lotId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_sale_line_allocations_lot"`);
    await queryRunner.query(`DROP INDEX "IDX_sale_line_allocations_line"`);
    await queryRunner.query(`DROP TABLE "sale_line_allocations"`);
    await queryRunner.query(`DROP INDEX "IDX_sale_lines_medicine"`);
    await queryRunner.query(`DROP INDEX "IDX_sale_lines_sale"`);
    await queryRunner.query(`DROP TABLE "sale_lines"`);
    await queryRunner.query(`DROP INDEX "IDX_sales_tenant_recorded"`);
    await queryRunner.query(`DROP INDEX "IDX_sales_tenant_branch"`);
    await queryRunner.query(`DROP TABLE "sales"`);
  }
}
