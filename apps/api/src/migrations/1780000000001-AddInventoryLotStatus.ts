import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddInventoryLotStatus1780000000001 implements MigrationInterface {
  name = "AddInventoryLotStatus1780000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "inventory_lot_status_enum" AS ENUM ('ACTIVE', 'QUARANTINE', 'RECALLED')
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_lots"
      ADD COLUMN "status" "inventory_lot_status_enum" NOT NULL DEFAULT 'ACTIVE'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "inventory_lots" DROP COLUMN "status"
    `);
    await queryRunner.query(`DROP TYPE "inventory_lot_status_enum"`);
  }
}
