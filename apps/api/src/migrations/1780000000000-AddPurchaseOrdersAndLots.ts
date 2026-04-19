import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPurchaseOrdersAndLots1780000000000 implements MigrationInterface {
  name = "AddPurchaseOrdersAndLots1780000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "purchase_order_status_enum" AS ENUM ('DRAFT', 'APPROVED', 'RECEIVED')
    `);
    await queryRunner.query(`
      CREATE TYPE "inventory_movement_type_enum" AS ENUM ('RECEIPT')
    `);
    await queryRunner.query(`
      CREATE TYPE "inventory_movement_reference_enum" AS ENUM ('PURCHASE_ORDER_RECEIPT', 'MANUAL_RECEIPT')
    `);

    await queryRunner.query(`
      CREATE TABLE "purchase_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "orderNumber" character varying,
        "status" "purchase_order_status_enum" NOT NULL DEFAULT 'DRAFT',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_orders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_purchase_orders_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_tenant_branch" ON "purchase_orders" ("tenantId", "branchId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "purchase_order_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "purchaseOrderId" uuid NOT NULL,
        "medicineId" uuid NOT NULL,
        "orderedQuantity" integer NOT NULL,
        "unitCost" numeric(14,4),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_order_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_purchase_order_lines_po" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_purchase_order_lines_medicine" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_order_lines_po" ON "purchase_order_lines" ("purchaseOrderId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "purchase_order_receipts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "purchaseOrderId" uuid NOT NULL,
        "receiptKey" character varying NOT NULL,
        "receivedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_order_receipts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_purchase_order_receipts_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_purchase_order_receipts_po" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_purchase_order_receipts_key" ON "purchase_order_receipts" ("tenantId", "purchaseOrderId", "receiptKey")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_order_receipts_po" ON "purchase_order_receipts" ("purchaseOrderId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "purchase_order_receipt_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "receiptId" uuid NOT NULL,
        "purchaseOrderLineId" uuid NOT NULL,
        "medicineId" uuid NOT NULL,
        "lotCode" character varying NOT NULL,
        "expiryDate" date NOT NULL,
        "quantity" integer NOT NULL,
        "unitCost" numeric(14,4) NOT NULL,
        "expiryOverrideReason" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_order_receipt_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_purchase_order_receipt_lines_receipt" FOREIGN KEY ("receiptId") REFERENCES "purchase_order_receipts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_purchase_order_receipt_lines_line" FOREIGN KEY ("purchaseOrderLineId") REFERENCES "purchase_order_lines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_purchase_order_receipt_lines_medicine" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_order_receipt_lines_receipt" ON "purchase_order_receipt_lines" ("receiptId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "inventory_lots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "medicineId" uuid NOT NULL,
        "lotCode" character varying NOT NULL,
        "expiryDate" date NOT NULL,
        "unitCost" numeric(14,4) NOT NULL,
        "quantityOnHand" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_lots" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inventory_lots_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inventory_lots_medicine" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inventory_lots_unique" ON "inventory_lots" ("tenantId", "branchId", "medicineId", "lotCode", "expiryDate", "unitCost")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_lots_tenant_branch_medicine" ON "inventory_lots" ("tenantId", "branchId", "medicineId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "inventory_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "medicineId" uuid NOT NULL,
        "lotId" uuid NOT NULL,
        "type" "inventory_movement_type_enum" NOT NULL,
        "referenceType" "inventory_movement_reference_enum" NOT NULL,
        "referenceId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unitCost" numeric(14,4) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_movements" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inventory_movements_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inventory_movements_medicine" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inventory_movements_lot" FOREIGN KEY ("lotId") REFERENCES "inventory_lots"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_movements_tenant_branch_medicine" ON "inventory_movements" ("tenantId", "branchId", "medicineId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_inventory_movements_tenant_branch_medicine"`);
    await queryRunner.query(`DROP TABLE "inventory_movements"`);
    await queryRunner.query(`DROP INDEX "IDX_inventory_lots_tenant_branch_medicine"`);
    await queryRunner.query(`DROP INDEX "UQ_inventory_lots_unique"`);
    await queryRunner.query(`DROP TABLE "inventory_lots"`);
    await queryRunner.query(`DROP INDEX "IDX_purchase_order_receipt_lines_receipt"`);
    await queryRunner.query(`DROP TABLE "purchase_order_receipt_lines"`);
    await queryRunner.query(`DROP INDEX "IDX_purchase_order_receipts_po"`);
    await queryRunner.query(`DROP INDEX "UQ_purchase_order_receipts_key"`);
    await queryRunner.query(`DROP TABLE "purchase_order_receipts"`);
    await queryRunner.query(`DROP INDEX "IDX_purchase_order_lines_po"`);
    await queryRunner.query(`DROP TABLE "purchase_order_lines"`);
    await queryRunner.query(`DROP INDEX "IDX_purchase_orders_tenant_branch"`);
    await queryRunner.query(`DROP TABLE "purchase_orders"`);
    await queryRunner.query(`DROP TYPE "inventory_movement_reference_enum"`);
    await queryRunner.query(`DROP TYPE "inventory_movement_type_enum"`);
    await queryRunner.query(`DROP TYPE "purchase_order_status_enum"`);
  }
}
