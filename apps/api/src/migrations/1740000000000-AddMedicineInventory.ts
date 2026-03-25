import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMedicineInventory1740000000000 implements MigrationInterface {
  name = 'AddMedicineInventory1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "medicine_transaction_type_enum" AS ENUM ('BUY', 'SELL')
    `);
    await queryRunner.query(`
      CREATE TABLE "medicines" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "sku" character varying,
        "unit" character varying,
        "stockQuantity" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_medicines_name" UNIQUE ("name"),
        CONSTRAINT "PK_medicines" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "medicine_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "medicineId" uuid NOT NULL,
        "type" "medicine_transaction_type_enum" NOT NULL,
        "quantity" integer NOT NULL,
        "unitPrice" numeric(14,4),
        "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "patientId" uuid,
        "notes" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_medicine_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_medicine_transactions_medicine" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_medicine_transactions_patient" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_medicine_transactions_medicineId" ON "medicine_transactions" ("medicineId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_medicine_transactions_patientId" ON "medicine_transactions" ("patientId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_medicine_transactions_medicine_recorded" ON "medicine_transactions" ("medicineId", "recordedAt" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_medicine_transactions_medicine_recorded"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_medicine_transactions_patientId"`);
    await queryRunner.query(`DROP INDEX "IDX_medicine_transactions_medicineId"`);
    await queryRunner.query(`DROP TABLE "medicine_transactions"`);
    await queryRunner.query(`DROP TABLE "medicines"`);
    await queryRunner.query(`DROP TYPE "medicine_transaction_type_enum"`);
  }
}
