import * as bcrypt from "bcrypt";
import type { DataSource } from "typeorm";

/**
 * Idempotent: ensures platform tenant, owner user, and platform_admin membership exist.
 * Runs on API startup; `pnpm run seed` is optional for CLI/scripts.
 */
export async function seedPlatformBootstrap(dataSource: DataSource): Promise<void> {
  const platformTenantName = process.env.PLATFORM_TENANT_NAME?.trim() || "Platform";
  const platformOwnerEmail =
    process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase() || "platform.owner@pharma.local";
  const platformOwnerPasswordHashFromEnv = process.env.PLATFORM_OWNER_PASSWORD_HASH?.trim();
  const platformOwnerPasswordFromEnv = process.env.PLATFORM_OWNER_PASSWORD;

  const tenantRows = await dataSource.query(
    `SELECT "id" FROM "tenants" WHERE "name" = $1 LIMIT 1`,
    [platformTenantName],
  );
  const tenantId =
    tenantRows[0]?.id ??
    (
      await dataSource.query(`INSERT INTO "tenants" ("name") VALUES ($1) RETURNING "id"`, [
        platformTenantName,
      ])
    )[0].id;

  const userRows = await dataSource.query(
    `SELECT "id", "platformAdmin" FROM "users" WHERE "email" = $1 LIMIT 1`,
    [platformOwnerEmail],
  );
  const isProduction = process.env.NODE_ENV === "production";
  const devBootstrapPassword = "dev-platform-owner-change-me";
  if (!userRows[0]?.id && !platformOwnerPasswordHashFromEnv && !platformOwnerPasswordFromEnv) {
    if (isProduction) {
      throw new Error(
        "Platform owner seed requires PLATFORM_OWNER_PASSWORD_HASH or PLATFORM_OWNER_PASSWORD when user is missing",
      );
    }
    console.warn(
      `[seed] No PLATFORM_OWNER_PASSWORD* set; using insecure dev-only password "${devBootstrapPassword}" for ${platformOwnerEmail}`,
    );
  }

  const platformOwnerPasswordHash =
    platformOwnerPasswordHashFromEnv ||
    (platformOwnerPasswordFromEnv
      ? await bcrypt.hash(platformOwnerPasswordFromEnv, 10)
      : !userRows[0]?.id && !isProduction
        ? await bcrypt.hash(devBootstrapPassword, 10)
        : undefined);
  const ownerUserId =
    userRows[0]?.id ??
    (
      await dataSource.query(
        `INSERT INTO "users" ("email", "passwordHash", "platformAdmin") VALUES ($1, $2, true) RETURNING "id"`,
        [platformOwnerEmail, platformOwnerPasswordHash],
      )
    )[0].id;

  if (userRows[0]?.id && userRows[0].platformAdmin !== true) {
    await dataSource.query(`UPDATE "users" SET "platformAdmin" = true WHERE "id" = $1`, [
      ownerUserId,
    ]);
  }

  await dataSource.query(
    `
      INSERT INTO "user_memberships" ("tenantId", "branchId", "userId", "role")
      SELECT $1::uuid, NULL, $2::varchar, 'platform_admin'::user_role_enum
      WHERE NOT EXISTS (
        SELECT 1
        FROM "user_memberships"
        WHERE "tenantId" = $1::uuid
          AND "userId" = $2::varchar
          AND "role" = 'platform_admin'
          AND "branchId" IS NULL
      )
    `,
    [tenantId, ownerUserId],
  );
}
