import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Patient } from "./patient.entity";

@Entity({ name: "patient_history" })
export class PatientHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  patientId: string;

  @ManyToOne(
    () => Patient,
    (p) => p.history,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "patientId" })
  patient: Patient;

  @Column({ type: "timestamptz" })
  recordedAt: Date;

  @Column({ type: "int", nullable: true })
  bloodPressureSystolic: number | null;

  @Column({ type: "int", nullable: true })
  bloodPressureDiastolic: number | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
