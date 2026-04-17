import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPatientTables1731800000000 implements MigrationInterface {
  name = "AddPatientTables1731800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "patients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "phone" character varying NOT NULL,
        "name" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_patients_phone" UNIQUE ("phone"),
        CONSTRAINT "PK_patients" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "patient_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "patientId" uuid NOT NULL,
        "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "bloodPressureSystolic" integer,
        "bloodPressureDiastolic" integer,
        "notes" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_patient_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_patient_history_patient" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_patient_history_patientId" ON "patient_history" ("patientId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_patient_history_patientId"`);
    await queryRunner.query(`DROP TABLE "patient_history"`);
    await queryRunner.query(`DROP TABLE "patients"`);
  }
}
