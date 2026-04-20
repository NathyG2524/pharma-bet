import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddInventoryAdjustments1820000000000 implements MigrationInterface {
  name = "AddInventoryAdjustments1820000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inventory_adjustments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "lotId" uuid NOT NULL,
        "medicineId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "reasonCode" character varying NOT NULL,
        "notes" text,
        "status" character varying NOT NULL DEFAULT 'draft',
        "requestedByUserId" character varying NOT NULL,
        "approvalInstanceId" uuid,
        "postedAt" TIMESTAMP WITH TIME ZONE,
        "postedByUserId" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_adjustments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inventory_adjustments_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inventory_adjustments_lot" FOREIGN KEY ("lotId") REFERENCES "inventory_lots"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_inventory_adjustments_medicine" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_adjustments_tenant_branch" ON "inventory_adjustments" ("tenantId", "branchId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inventory_adjustments_approval" ON "inventory_adjustments" ("approvalInstanceId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "stock_count_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'open',
        "notes" text,
        "openedByUserId" character varying NOT NULL,
        "approvalInstanceId" uuid,
        "submittedAt" TIMESTAMP WITH TIME ZONE,
        "postedAt" TIMESTAMP WITH TIME ZONE,
        "postedByUserId" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_count_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stock_count_sessions_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_count_sessions_tenant_branch" ON "stock_count_sessions" ("tenantId", "branchId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_count_sessions_approval" ON "stock_count_sessions" ("approvalInstanceId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "stock_count_variances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sessionId" uuid NOT NULL,
        "tenantId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "lotId" uuid NOT NULL,
        "medicineId" uuid NOT NULL,
        "systemQuantity" integer NOT NULL,
        "countedQuantity" integer NOT NULL,
        "varianceQuantity" integer NOT NULL,
        "reasonCode" character varying NOT NULL,
        "notes" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stock_count_variances" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stock_count_variances_session" FOREIGN KEY ("sessionId") REFERENCES "stock_count_sessions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_stock_count_variances_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_stock_count_variances_lot" FOREIGN KEY ("lotId") REFERENCES "inventory_lots"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_stock_count_variances_medicine" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_count_variances_session" ON "stock_count_variances" ("sessionId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_count_variances_tenant_branch" ON "stock_count_variances" ("tenantId", "branchId")`,
    );

    // Extend movement type enums to include ADJUSTMENT and STOCK_COUNT_VARIANCE
    await queryRunner.query(
      `ALTER TYPE "inventory_movement_type_enum" ADD VALUE IF NOT EXISTS 'ADJUSTMENT'`,
    );
    await queryRunner.query(
      `ALTER TYPE "inventory_movement_type_enum" ADD VALUE IF NOT EXISTS 'STOCK_COUNT_VARIANCE'`,
    );
    await queryRunner.query(
      `ALTER TYPE "inventory_movement_reference_enum" ADD VALUE IF NOT EXISTS 'INVENTORY_ADJUSTMENT'`,
    );
    await queryRunner.query(
      `ALTER TYPE "inventory_movement_reference_enum" ADD VALUE IF NOT EXISTS 'STOCK_COUNT_VARIANCE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_stock_count_variances_tenant_branch"`);
    await queryRunner.query(`DROP INDEX "IDX_stock_count_variances_session"`);
    await queryRunner.query(`DROP TABLE "stock_count_variances"`);
    await queryRunner.query(`DROP INDEX "IDX_stock_count_sessions_approval"`);
    await queryRunner.query(`DROP INDEX "IDX_stock_count_sessions_tenant_branch"`);
    await queryRunner.query(`DROP TABLE "stock_count_sessions"`);
    await queryRunner.query(`DROP INDEX "IDX_inventory_adjustments_approval"`);
    await queryRunner.query(`DROP INDEX "IDX_inventory_adjustments_tenant_branch"`);
    await queryRunner.query(`DROP TABLE "inventory_adjustments"`);
  }
}
