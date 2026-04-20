import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddTransfers1800000000000 implements MigrationInterface {
  name = "AddTransfers1800000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "transfer_status_enum" AS ENUM ('draft', 'in_transit', 'received', 'received_with_variance');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE "transfers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "sourceBranchId" uuid NOT NULL,
        "destinationBranchId" uuid NOT NULL,
        "status" "transfer_status_enum" NOT NULL DEFAULT 'draft',
        "notes" text,
        "createdBy" character varying,
        "shippedBy" character varying,
        "receivedBy" character varying,
        "shippedAt" TIMESTAMP WITH TIME ZONE,
        "receivedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transfers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transfers_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transfers_source_branch" FOREIGN KEY ("sourceBranchId") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transfers_destination_branch" FOREIGN KEY ("destinationBranchId") REFERENCES "branches"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_transfers_tenant_source" ON "transfers" ("tenantId", "sourceBranchId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transfers_tenant_destination" ON "transfers" ("tenantId", "destinationBranchId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transfers_tenant_status" ON "transfers" ("tenantId", "status")`,
    );

    await queryRunner.query(`
      CREATE TABLE "transfer_lines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "transferId" uuid NOT NULL,
        "medicineId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "overrideReason" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transfer_lines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transfer_lines_transfer" FOREIGN KEY ("transferId") REFERENCES "transfers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transfer_lines_medicine" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_transfer_lines_transfer" ON "transfer_lines" ("transferId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transfer_lines_medicine" ON "transfer_lines" ("medicineId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "transfer_line_allocations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "transferLineId" uuid NOT NULL,
        "lotId" uuid NOT NULL,
        "lotCode" character varying NOT NULL,
        "expiryDate" date NOT NULL,
        "unitCost" numeric(14,4) NOT NULL,
        "quantityShipped" integer NOT NULL,
        "quantityReceived" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transfer_line_allocations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transfer_line_allocations_line" FOREIGN KEY ("transferLineId") REFERENCES "transfer_lines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transfer_line_allocations_lot" FOREIGN KEY ("lotId") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_transfer_line_allocations_line" ON "transfer_line_allocations" ("transferLineId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transfer_line_allocations_lot" ON "transfer_line_allocations" ("lotId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_transfer_line_allocations_lot"`);
    await queryRunner.query(`DROP INDEX "IDX_transfer_line_allocations_line"`);
    await queryRunner.query(`DROP TABLE "transfer_line_allocations"`);
    await queryRunner.query(`DROP INDEX "IDX_transfer_lines_medicine"`);
    await queryRunner.query(`DROP INDEX "IDX_transfer_lines_transfer"`);
    await queryRunner.query(`DROP TABLE "transfer_lines"`);
    await queryRunner.query(`DROP INDEX "IDX_transfers_tenant_status"`);
    await queryRunner.query(`DROP INDEX "IDX_transfers_tenant_destination"`);
    await queryRunner.query(`DROP INDEX "IDX_transfers_tenant_source"`);
    await queryRunner.query(`DROP TABLE "transfers"`);
    await queryRunner.query(`DROP TYPE "transfer_status_enum"`);
  }
}
