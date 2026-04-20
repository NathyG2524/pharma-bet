import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSupplierReturns1830000000000 implements MigrationInterface {
  name = "AddSupplierReturns1830000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "supplier_returns" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "supplierId" uuid NOT NULL,
        "sourcePurchaseOrderId" uuid,
        "sourceReceiptId" uuid,
        "status" character varying NOT NULL DEFAULT 'draft',
        "notes" text,
        "requestedByUserId" character varying NOT NULL,
        "hqConfirmedByUserId" character varying,
        "hqConfirmedAt" TIMESTAMP WITH TIME ZONE,
        "hqConfirmationNotes" text,
        "approvalInstanceId" uuid,
        "dispatchedAt" TIMESTAMP WITH TIME ZONE,
        "dispatchedByUserId" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_supplier_returns" PRIMARY KEY ("id"),
        CONSTRAINT "FK_supplier_returns_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_supplier_returns_supplier" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_supplier_returns_po" FOREIGN KEY ("sourcePurchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_supplier_returns_receipt" FOREIGN KEY ("sourceReceiptId") REFERENCES "purchase_order_receipts"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_returns_tenant_branch" ON "supplier_returns" ("tenantId", "branchId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_returns_approval" ON "supplier_returns" ("approvalInstanceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_returns_supplier" ON "supplier_returns" ("supplierId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "supplier_return_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "returnId" uuid NOT NULL,
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "lotId" uuid NOT NULL,
        "medicineId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "notes" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_supplier_return_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_supplier_return_lines_return" FOREIGN KEY ("returnId") REFERENCES "supplier_returns"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_supplier_return_lines_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_supplier_return_lines_lot" FOREIGN KEY ("lotId") REFERENCES "inventory_lots"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_supplier_return_lines_medicine" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_return_lines_return" ON "supplier_return_lines" ("returnId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_supplier_return_lines_tenant_branch" ON "supplier_return_lines" ("tenantId", "branchId")`,
    );

    // Extend inventory movement enums
    await queryRunner.query(
      `ALTER TYPE "inventory_movement_type_enum" ADD VALUE IF NOT EXISTS 'SUPPLIER_RETURN'`,
    );
    await queryRunner.query(
      `ALTER TYPE "inventory_movement_reference_enum" ADD VALUE IF NOT EXISTS 'SUPPLIER_RETURN'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_supplier_return_lines_tenant_branch"`);
    await queryRunner.query(`DROP INDEX "IDX_supplier_return_lines_return"`);
    await queryRunner.query(`DROP TABLE "supplier_return_lines"`);
    await queryRunner.query(`DROP INDEX "IDX_supplier_returns_supplier"`);
    await queryRunner.query(`DROP INDEX "IDX_supplier_returns_approval"`);
    await queryRunner.query(`DROP INDEX "IDX_supplier_returns_tenant_branch"`);
    await queryRunner.query(`DROP TABLE "supplier_returns"`);
  }
}
