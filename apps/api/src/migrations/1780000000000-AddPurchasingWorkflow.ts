import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPurchasingWorkflow1780000000000 implements MigrationInterface {
  name = "AddPurchasingWorkflow1780000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Guarded because other migrations may have already created these objects.
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "purchase_order_status_enum" AS ENUM (
          'draft',
          'pending_approval',
          'approved',
          'rejected',
          'changes_requested'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Suppliers may be created by AddSuppliersAndMappings; create only if missing.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "suppliers" (
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
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_suppliers_tenant_name" ON "suppliers" ("tenantId", "name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_suppliers_tenant" ON "suppliers" ("tenantId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "purchase_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "supplierId" uuid NOT NULL,
        "status" "purchase_order_status_enum" NOT NULL DEFAULT 'draft',
        "notes" text,
        "createdBy" character varying NOT NULL,
        "updatedBy" character varying NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_orders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_purchase_orders_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_purchase_orders_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_purchase_orders_supplier" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_tenant_branch" ON "purchase_orders" ("tenantId", "branchId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_orders_tenant_status" ON "purchase_orders" ("tenantId", "status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "purchase_order_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "purchaseOrderId" uuid NOT NULL,
        "medicineId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unitCost" numeric(14,4),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_order_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_purchase_order_lines_po" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_purchase_order_lines_medicine" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_order_lines_po" ON "purchase_order_lines" ("purchaseOrderId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_order_lines_medicine" ON "purchase_order_lines" ("medicineId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "purchase_order_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "purchaseOrderId" uuid NOT NULL,
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "userId" character varying NOT NULL,
        "action" character varying NOT NULL,
        "reason" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_order_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_purchase_order_events_po" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_order_events_po" ON "purchase_order_events" ("purchaseOrderId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_purchase_order_events_tenant" ON "purchase_order_events" ("tenantId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_purchase_order_events_tenant"`);
    await queryRunner.query(`DROP INDEX "IDX_purchase_order_events_po"`);
    await queryRunner.query(`DROP TABLE "purchase_order_events"`);

    await queryRunner.query(`DROP INDEX "IDX_purchase_order_lines_medicine"`);
    await queryRunner.query(`DROP INDEX "IDX_purchase_order_lines_po"`);
    await queryRunner.query(`DROP TABLE "purchase_order_lines"`);

    await queryRunner.query(`DROP INDEX "IDX_purchase_orders_tenant_status"`);
    await queryRunner.query(`DROP INDEX "IDX_purchase_orders_tenant_branch"`);
    await queryRunner.query(`DROP TABLE "purchase_orders"`);
    await queryRunner.query(`DROP TYPE "purchase_order_status_enum"`);
  }
}
