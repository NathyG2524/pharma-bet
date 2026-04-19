import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Branch } from "./branch.entity";
import { Medicine } from "./medicine.entity";

@Entity({ name: "medicine_overlays" })
@Index("UQ_medicine_overlays_tenant_branch_medicine", ["tenantId", "branchId", "medicineId"], {
  unique: true,
})
@Index("IDX_medicine_overlays_tenant_branch", ["tenantId", "branchId"])
export class MedicineOverlay {
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
    (medicine) => medicine.overlays,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "medicineId" })
  medicine: Medicine;

  @Column({ type: "int", default: 0 })
  stockQuantity: number;

  @Column({ type: "int", nullable: true })
  reorderMin: number | null;

  @Column({ type: "int", nullable: true })
  reorderMax: number | null;

  @Column({ type: "varchar", nullable: true })
  binLocation: string | null;

  @Column({ type: "decimal", precision: 14, scale: 4, nullable: true })
  localPrice: string | null;

  @Column({ type: "decimal", precision: 14, scale: 4, nullable: true })
  localCost: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
