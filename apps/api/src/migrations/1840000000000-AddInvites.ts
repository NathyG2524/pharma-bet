import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddInvites1840000000000 implements MigrationInterface {
  name = "AddInvites1840000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "invite_type_enum" AS ENUM ('first_hq_admin', 'branch_staff')
    `);
    await queryRunner.query(`
      CREATE TABLE "invites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "invite_type_enum" NOT NULL,
        "tenantId" uuid NOT NULL,
        "branchId" uuid,
        "email" character varying NOT NULL,
        "tokenHash" character varying NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "consumedAt" TIMESTAMP WITH TIME ZONE,
        "createdByUserId" uuid,
        "revokedAt" TIMESTAMP WITH TIME ZONE,
        "role" "user_role_enum" NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invites" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invites_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invites_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invites_createdBy" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_invites_tokenHash" ON "invites" ("tokenHash")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_invites_tenant" ON "invites" ("tenantId")`);
    await queryRunner.query(`CREATE INDEX "IDX_invites_email" ON "invites" ("email")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_invites_email"`);
    await queryRunner.query(`DROP INDEX "IDX_invites_tenant"`);
    await queryRunner.query(`DROP INDEX "UQ_invites_tokenHash"`);
    await queryRunner.query(`DROP TABLE "invites"`);
    await queryRunner.query(`DROP TYPE "invite_type_enum"`);
  }
}
