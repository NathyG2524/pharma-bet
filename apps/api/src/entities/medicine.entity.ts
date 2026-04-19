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
import { MedicineOverlay } from "./medicine-overlay.entity";
import { MedicineTransaction } from "./medicine-transaction.entity";
import { TaxCategory } from "./tax-category.entity";

export enum MedicineStatus {
  CANONICAL = "canonical",
  DRAFT = "draft",
}

@Entity({ name: "medicines" })
@Index("UQ_medicines_tenant_name", ["tenantId", "name"], { unique: true })
export class Medicine {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: "varchar", nullable: true })
  sku: string | null;

  @Column({ type: "varchar", nullable: true })
  unit: string | null;

  @Column({ type: "varchar", nullable: true })
  barcode: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({
    type: "enum",
    enum: MedicineStatus,
    enumName: "medicine_status_enum",
    default: MedicineStatus.CANONICAL,
  })
  status: MedicineStatus;

  @Column({ type: "uuid", nullable: true })
  draftBranchId: string | null;

  @Column({ type: "uuid", nullable: true })
  taxCategoryId: string | null;

  @ManyToOne(() => TaxCategory, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "taxCategoryId" })
  taxCategory: TaxCategory | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(
    () => MedicineOverlay,
    (overlay) => overlay.medicine,
  )
  overlays: MedicineOverlay[];

  @OneToMany(
    () => MedicineTransaction,
    (t) => t.medicine,
  )
  transactions: MedicineTransaction[];
}
