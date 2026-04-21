import * as bcrypt from "bcrypt";
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

    const platformTenantName = process.env.PLATFORM_TENANT_NAME?.trim() || "Platform";
    const platformOwnerEmail =
      process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase() || "platform.owner@pharma.local";
    const platformOwnerPasswordHashFromEnv = process.env.PLATFORM_OWNER_PASSWORD_HASH?.trim();
    const platformOwnerPasswordFromEnv = process.env.PLATFORM_OWNER_PASSWORD;

    const tenantRows = await queryRunner.query(
      `SELECT "id" FROM "tenants" WHERE "name" = $1 LIMIT 1`,
      [platformTenantName],
    );
    const tenantId =
      tenantRows[0]?.id ??
      (
        await queryRunner.query(`INSERT INTO "tenants" ("name") VALUES ($1) RETURNING "id"`, [
          platformTenantName,
        ])
      )[0].id;

    const userRows = await queryRunner.query(
      `SELECT "id", "platformAdmin" FROM "users" WHERE "email" = $1 LIMIT 1`,
      [platformOwnerEmail],
    );
    if (!userRows[0]?.id && !platformOwnerPasswordHashFromEnv && !platformOwnerPasswordFromEnv) {
      throw new Error(
        "Platform owner seed requires PLATFORM_OWNER_PASSWORD_HASH or PLATFORM_OWNER_PASSWORD when user is missing",
      );
    }

    const platformOwnerPasswordHash =
      platformOwnerPasswordHashFromEnv ||
      (platformOwnerPasswordFromEnv ? await bcrypt.hash(platformOwnerPasswordFromEnv, 10) : undefined);
    const ownerUserId =
      userRows[0]?.id ??
      (
        await queryRunner.query(
          `INSERT INTO "users" ("email", "passwordHash", "platformAdmin") VALUES ($1, $2, true) RETURNING "id"`,
          [platformOwnerEmail, platformOwnerPasswordHash],
        )
      )[0].id;

    if (userRows[0]?.id && userRows[0].platformAdmin !== true) {
      await queryRunner.query(`UPDATE "users" SET "platformAdmin" = true WHERE "id" = $1`, [
        ownerUserId,
      ]);
    }

    await queryRunner.query(
      `
        INSERT INTO "user_memberships" ("tenantId", "branchId", "userId", "role")
        SELECT $1, NULL, $2, 'platform_admin'
        WHERE NOT EXISTS (
          SELECT 1
          FROM "user_memberships"
          WHERE "tenantId" = $1
            AND "userId" = $2
            AND "role" = 'platform_admin'
            AND "branchId" IS NULL
        )
      `,
      [tenantId, ownerUserId],
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
