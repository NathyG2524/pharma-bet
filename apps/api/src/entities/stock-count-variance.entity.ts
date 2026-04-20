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
import { StockCountSession } from "./stock-count-session.entity";

export const STOCK_COUNT_REASON_CODES = [
  "counting_error",
  "expiry_destruction",
  "theft",
  "damage",
  "other",
] as const;
export type StockCountReasonCode = (typeof STOCK_COUNT_REASON_CODES)[number];

@Entity({ name: "stock_count_variances" })
@Index("IDX_stock_count_variances_session", ["sessionId"])
@Index("IDX_stock_count_variances_tenant_branch", ["tenantId", "branchId"])
export class StockCountVariance {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  sessionId: string;

  @ManyToOne(() => StockCountSession, (s) => s.variances, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sessionId" })
  session: StockCountSession;

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

  /** System quantity at time of session submission */
  @Column({ type: "int" })
  systemQuantity: number;

  /** Counted quantity */
  @Column({ type: "int" })
  countedQuantity: number;

  /** Variance = countedQuantity - systemQuantity (positive = overage, negative = shortage) */
  @Column({ type: "int" })
  varianceQuantity: number;

  @Column({ type: "varchar" })
  reasonCode: StockCountReasonCode;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
