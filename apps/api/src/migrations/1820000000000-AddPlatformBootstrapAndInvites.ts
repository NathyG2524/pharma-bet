import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlatformBootstrapAndInvites1820000000000 implements MigrationInterface {
  name = "AddPlatformBootstrapAndInvites1820000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "platformAdmin" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_platform_admin" ON "users" ("platformAdmin")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid,
        "email" character varying NOT NULL,
        "tokenHash" character varying NOT NULL,
        "role" "user_role_enum" NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "consumedAt" TIMESTAMP WITH TIME ZONE,
        "revokedAt" TIMESTAMP WITH TIME ZONE,
        "createdByUserId" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invites" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invites_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invites_branch" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invites_created_by_user" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_invites_email_normalized" CHECK ("email" = lower("email")),
        CONSTRAINT "CHK_invites_branch_role" CHECK (
          (
            "role" IN ('branch_manager', 'branch_user')
            AND "branchId" IS NOT NULL
          ) OR (
            "role" NOT IN ('branch_manager', 'branch_user')
            AND "branchId" IS NULL
          )
        )
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_invites_token_hash" ON "invites" ("tokenHash")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invites_tenant_email" ON "invites" ("tenantId", "email")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invites_branch" ON "invites" ("branchId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_invites_open_lookup" ON "invites" ("tenantId", "role", "expiresAt") WHERE "consumedAt" IS NULL AND "revokedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invites_open_lookup"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invites_branch"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invites_tenant_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_invites_token_hash"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invites"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_platform_admin"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "platformAdmin"`);
  }
}
