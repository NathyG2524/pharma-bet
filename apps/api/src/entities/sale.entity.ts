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
import { Patient } from "./patient.entity";
import { SaleLine } from "./sale-line.entity";
import { Tenant } from "./tenant.entity";

@Entity({ name: "sales" })
@Index("IDX_sales_tenant_branch", ["tenantId", "branchId"])
@Index("IDX_sales_tenant_recorded", ["tenantId", "recordedAt"])
export class Sale {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant: Tenant;

  @Column({ type: "uuid" })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "branchId" })
  branch: Branch;

  @Column({ type: "uuid", nullable: true })
  patientId: string | null;

  @ManyToOne(() => Patient, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "patientId" })
  patient: Patient | null;

  @Column({ type: "timestamptz" })
  recordedAt: Date;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  subtotal: string;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  taxTotal: string;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  totalAmount: string;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  cogsTotal: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(
    () => SaleLine,
    (line) => line.sale,
  )
  lines: SaleLine[];
}
