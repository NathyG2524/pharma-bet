import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Branch } from "./branch.entity";
import { PatientHistory } from "./patient-history.entity";

@Entity({ name: "patients" })
@Index("UQ_patients_tenant_phone", ["tenantId", "phone"], { unique: true })
export class Patient {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @Column({ type: "uuid" })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "branchId" })
  branch: Branch;

  @Column()
  phone: string;

  @Column({ type: "varchar", nullable: true })
  name: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(
    () => PatientHistory,
    (h) => h.patient,
  )
  history: PatientHistory[];
}
