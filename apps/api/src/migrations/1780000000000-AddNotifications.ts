import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotifications1780000000000 implements MigrationInterface {
  name = "AddNotifications1780000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "branchId" uuid,
        "userId" character varying NOT NULL,
        "title" character varying NOT NULL,
        "body" text NOT NULL,
        "link" character varying,
        "eventType" character varying NOT NULL,
        "eventKey" character varying NOT NULL,
        "isRead" boolean NOT NULL DEFAULT false,
        "readAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user" ON "notifications" ("tenantId", "userId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_notifications_event" ON "notifications" ("tenantId", "userId", "eventKey")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_notifications_event"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_user"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
