import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddApprovalOrchestration1810000000000 implements MigrationInterface {
  name = "AddApprovalOrchestration1810000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tenant_approval_policies" (
        "tenantId" uuid NOT NULL,
        "allowHqBreakGlass" boolean NOT NULL DEFAULT false,
        "allowCombinedHqForSingleBranch" boolean NOT NULL DEFAULT false,
        "allowCombinedHqWhenBmUnavailable" boolean NOT NULL DEFAULT false,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_approval_policies" PRIMARY KEY ("tenantId"),
        CONSTRAINT "FK_tenant_approval_policies_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "approval_instances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid,
        "domainType" character varying NOT NULL,
        "domainId" character varying NOT NULL,
        "requestedByUserId" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "bmDelegateUserId" character varying,
        "bmUnavailable" boolean NOT NULL DEFAULT false,
        "breakGlassReason" text,
        "breakGlassExpiresAt" TIMESTAMP WITH TIME ZONE,
        "bmApproverUserId" character varying,
        "bmDecision" character varying,
        "bmDecisionPath" character varying,
        "bmDecisionReason" text,
        "bmDecidedAt" TIMESTAMP WITH TIME ZONE,
        "hqApproverUserId" character varying,
        "hqDecision" character varying,
        "hqDecisionPath" character varying,
        "hqDecisionReason" text,
        "hqDecidedAt" TIMESTAMP WITH TIME ZONE,
        "approvalPath" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_approval_instances" PRIMARY KEY ("id"),
        CONSTRAINT "FK_approval_instances_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_approval_instances_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_approval_instances_tenant_status" ON "approval_instances" ("tenantId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_approval_instances_domain" ON "approval_instances" ("tenantId", "domainType", "domainId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_approval_instances_domain"`);
    await queryRunner.query(`DROP INDEX "IDX_approval_instances_tenant_status"`);
    await queryRunner.query(`DROP TABLE "approval_instances"`);
    await queryRunner.query(`DROP TABLE "tenant_approval_policies"`);
  }
}
