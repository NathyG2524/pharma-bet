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
import { InventoryLot } from "./inventory-lot.entity";
import { Medicine } from "./medicine.entity";

export type AdjustmentStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "posted";

export const ADJUSTMENT_REASON_CODES = [
  "shrink",
  "damage",
  "expiry_destruction",
  "samples",
  "theft",
  "other",
] as const;
export type AdjustmentReasonCode = (typeof ADJUSTMENT_REASON_CODES)[number];

@Entity({ name: "inventory_adjustments" })
@Index("IDX_inventory_adjustments_tenant_branch", ["tenantId", "branchId"])
@Index("IDX_inventory_adjustments_approval", ["approvalInstanceId"])
export class InventoryAdjustment {
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
  lotId: string;

  @ManyToOne(() => InventoryLot, { onDelete: "CASCADE" })
  @JoinColumn({ name: "lotId" })
  lot: InventoryLot;

  @Column({ type: "uuid" })
  medicineId: string;

  @ManyToOne(() => Medicine, { onDelete: "CASCADE" })
  @JoinColumn({ name: "medicineId" })
  medicine: Medicine;

  /** Positive = increase, negative = decrease */
  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "varchar" })
  reasonCode: AdjustmentReasonCode;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "varchar", default: "draft" })
  status: AdjustmentStatus;

  @Column({ type: "varchar" })
  requestedByUserId: string;

  @Column({ type: "uuid", nullable: true })
  approvalInstanceId: string | null;

  @Column({ type: "timestamptz", nullable: true })
  postedAt: Date | null;

  @Column({ type: "varchar", nullable: true })
  postedByUserId: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
