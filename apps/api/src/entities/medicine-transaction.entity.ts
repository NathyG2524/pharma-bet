import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Branch } from "./branch.entity";
import { Medicine } from "./medicine.entity";
import { Patient } from "./patient.entity";

export enum MedicineTransactionType {
  BUY = "BUY",
  SELL = "SELL",
}

@Entity({ name: "medicine_transactions" })
@Index("IDX_medicine_transactions_tenant_branch", ["tenantId", "branchId"])
export class MedicineTransaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @Column({ type: "uuid" })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "branchId" })
  branch: Branch;

  @Column({ type: "uuid" })
  medicineId: string;

  @ManyToOne(
    () => Medicine,
    (m) => m.transactions,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "medicineId" })
  medicine: Medicine;

  @Column({
    type: "enum",
    enum: MedicineTransactionType,
    enumName: "medicine_transaction_type_enum",
  })
  type: MedicineTransactionType;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 14, scale: 4, nullable: true })
  unitPrice: string | null;

  @Column({ type: "timestamptz" })
  recordedAt: Date;

  @Column({ type: "uuid", nullable: true })
  patientId: string | null;

  @ManyToOne(() => Patient, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "patientId" })
  patient: Patient | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
