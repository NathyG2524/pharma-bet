import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditEvents1760000000000 implements MigrationInterface {
  name = "AddAuditEvents1760000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid,
        "userId" character varying NOT NULL,
        "action" character varying NOT NULL,
        "patientId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_events_tenant_patient" ON "audit_events" ("tenantId", "patientId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_events_tenant_user" ON "audit_events" ("tenantId", "userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_audit_events_tenant_user"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_events_tenant_patient"`);
    await queryRunner.query(`DROP TABLE "audit_events"`);
  }
}
