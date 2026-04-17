import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddTenancyAndBranches1750000000000 implements MigrationInterface {
  name = "AddTenancyAndBranches1750000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM (
        'platform_admin',
        'hq_admin',
        'hq_user',
        'branch_manager',
        'branch_user'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tenants_name" UNIQUE ("name"),
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "branches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "code" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_branches" PRIMARY KEY ("id"),
        CONSTRAINT "FK_branches_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_branches_tenant_name" ON "branches" ("tenantId", "name")`,
    );
    await queryRunner.query(`
      CREATE TABLE "user_memberships" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid,
        "userId" character varying NOT NULL,
        "role" "user_role_enum" NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_memberships" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_memberships_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_memberships_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_memberships_unique" ON "user_memberships" ("tenantId", "userId", "branchId", "role")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_memberships_user" ON "user_memberships" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_memberships_tenant" ON "user_memberships" ("tenantId")`,
    );

    await queryRunner.query(`ALTER TABLE "patients" ADD "tenantId" uuid`);
    await queryRunner.query(`ALTER TABLE "patients" ADD "branchId" uuid`);
    await queryRunner.query(`ALTER TABLE "patient_history" ADD "tenantId" uuid`);
    await queryRunner.query(`ALTER TABLE "patient_history" ADD "branchId" uuid`);
    await queryRunner.query(`ALTER TABLE "medicines" ADD "tenantId" uuid`);
    await queryRunner.query(`ALTER TABLE "medicines" ADD "branchId" uuid`);
    await queryRunner.query(`ALTER TABLE "medicine_transactions" ADD "tenantId" uuid`);
    await queryRunner.query(`ALTER TABLE "medicine_transactions" ADD "branchId" uuid`);
    await queryRunner.query(`
      DO $$
      DECLARE
        tenant_id uuid;
        branch_id uuid;
      BEGIN
        SELECT "id" INTO tenant_id FROM "tenants" WHERE "name" = 'Legacy tenant';
        IF tenant_id IS NULL THEN
          INSERT INTO "tenants" ("name") VALUES ('Legacy tenant') RETURNING "id" INTO tenant_id;
        END IF;
        SELECT "id" INTO branch_id FROM "branches" WHERE "tenantId" = tenant_id AND "name" = 'Legacy branch';
        IF branch_id IS NULL THEN
          INSERT INTO "branches" ("tenantId", "name", "code")
          VALUES (tenant_id, 'Legacy branch', 'LEGACY')
          RETURNING "id" INTO branch_id;
        END IF;
        UPDATE "patients" SET "tenantId" = tenant_id, "branchId" = branch_id WHERE "tenantId" IS NULL;
        UPDATE "patient_history" SET "tenantId" = tenant_id, "branchId" = branch_id WHERE "tenantId" IS NULL;
        UPDATE "medicines" SET "tenantId" = tenant_id, "branchId" = branch_id WHERE "tenantId" IS NULL;
        UPDATE "medicine_transactions" SET "tenantId" = tenant_id, "branchId" = branch_id WHERE "tenantId" IS NULL;
      END $$;
    `);
    await queryRunner.query(`ALTER TABLE "patients" ALTER COLUMN "tenantId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "patients" ALTER COLUMN "branchId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "patient_history" ALTER COLUMN "tenantId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "patient_history" ALTER COLUMN "branchId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "medicines" ALTER COLUMN "tenantId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "medicines" ALTER COLUMN "branchId" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "medicine_transactions" ALTER COLUMN "tenantId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "medicine_transactions" ALTER COLUMN "branchId" SET NOT NULL`,
    );

    await queryRunner.query(`ALTER TABLE "patients" DROP CONSTRAINT "UQ_patients_phone"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_patients_tenant_phone" ON "patients" ("tenantId", "phone")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_patients_tenant_branch" ON "patients" ("tenantId", "branchId")`,
    );
    await queryRunner.query(`
      ALTER TABLE "patients"
      ADD CONSTRAINT "FK_patients_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_patient_history_tenant_branch" ON "patient_history" ("tenantId", "branchId")`,
    );
    await queryRunner.query(`
      ALTER TABLE "patient_history"
      ADD CONSTRAINT "FK_patient_history_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`ALTER TABLE "medicines" DROP CONSTRAINT "UQ_medicines_name"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_medicines_tenant_branch_name" ON "medicines" ("tenantId", "branchId", "name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_medicines_tenant_branch" ON "medicines" ("tenantId", "branchId")`,
    );
    await queryRunner.query(`
      ALTER TABLE "medicines"
      ADD CONSTRAINT "FK_medicines_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_medicine_transactions_tenant_branch" ON "medicine_transactions" ("tenantId", "branchId")`,
    );
    await queryRunner.query(`
      ALTER TABLE "medicine_transactions"
      ADD CONSTRAINT "FK_medicine_transactions_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "medicine_transactions" DROP CONSTRAINT "FK_medicine_transactions_branch"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_medicine_transactions_tenant_branch"`);
    await queryRunner.query(`ALTER TABLE "medicine_transactions" DROP COLUMN "branchId"`);
    await queryRunner.query(`ALTER TABLE "medicine_transactions" DROP COLUMN "tenantId"`);

    await queryRunner.query(`ALTER TABLE "medicines" DROP CONSTRAINT "FK_medicines_branch"`);
    await queryRunner.query(`DROP INDEX "IDX_medicines_tenant_branch"`);
    await queryRunner.query(`DROP INDEX "UQ_medicines_tenant_branch_name"`);
    await queryRunner.query(
      `ALTER TABLE "medicines" ADD CONSTRAINT "UQ_medicines_name" UNIQUE ("name")`,
    );
    await queryRunner.query(`ALTER TABLE "medicines" DROP COLUMN "branchId"`);
    await queryRunner.query(`ALTER TABLE "medicines" DROP COLUMN "tenantId"`);

    await queryRunner.query(
      `ALTER TABLE "patient_history" DROP CONSTRAINT "FK_patient_history_branch"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_patient_history_tenant_branch"`);
    await queryRunner.query(`ALTER TABLE "patient_history" DROP COLUMN "branchId"`);
    await queryRunner.query(`ALTER TABLE "patient_history" DROP COLUMN "tenantId"`);

    await queryRunner.query(`ALTER TABLE "patients" DROP CONSTRAINT "FK_patients_branch"`);
    await queryRunner.query(`DROP INDEX "IDX_patients_tenant_branch"`);
    await queryRunner.query(`DROP INDEX "UQ_patients_tenant_phone"`);
    await queryRunner.query(
      `ALTER TABLE "patients" ADD CONSTRAINT "UQ_patients_phone" UNIQUE ("phone")`,
    );
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "branchId"`);
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "tenantId"`);

    await queryRunner.query(`DROP INDEX "IDX_user_memberships_tenant"`);
    await queryRunner.query(`DROP INDEX "IDX_user_memberships_user"`);
    await queryRunner.query(`DROP INDEX "UQ_user_memberships_unique"`);
    await queryRunner.query(`DROP TABLE "user_memberships"`);
    await queryRunner.query(`DROP INDEX "UQ_branches_tenant_name"`);
    await queryRunner.query(`DROP TABLE "branches"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
