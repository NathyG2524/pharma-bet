import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditEvents1760000000000 implements MigrationInterface {
  name = "AddAuditEvents1760000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "actorUserId" character varying NOT NULL,
        "action" character varying NOT NULL,
        "entityType" character varying NOT NULL,
        "entityId" character varying NOT NULL,
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_events_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_events_tenant_created" ON "audit_events" ("tenantId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_events_tenant_actor" ON "audit_events" ("tenantId", "actorUserId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_events_tenant_entity" ON "audit_events" ("tenantId", "entityType")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_audit_events_tenant_entity"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_events_tenant_actor"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_events_tenant_created"`);
    await queryRunner.query(`DROP TABLE "audit_events"`);
  }
}
