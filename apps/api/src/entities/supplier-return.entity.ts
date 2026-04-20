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
import { PurchaseOrderReceipt } from "./purchase-order-receipt.entity";
import { PurchaseOrder } from "./purchase-order.entity";
import { SupplierReturnLine } from "./supplier-return-line.entity";
import { Supplier } from "./supplier.entity";

export type SupplierReturnStatus =
  | "draft"
  | "pending_hq_confirmation"
  | "hq_confirmed"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "dispatched";

@Entity({ name: "supplier_returns" })
@Index("IDX_supplier_returns_tenant_branch", ["tenantId", "branchId"])
@Index("IDX_supplier_returns_approval", ["approvalInstanceId"])
@Index("IDX_supplier_returns_supplier", ["supplierId"])
export class SupplierReturn {
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
  supplierId: string;

  @ManyToOne(() => Supplier, { onDelete: "CASCADE" })
  @JoinColumn({ name: "supplierId" })
  supplier: Supplier;

  @Column({ type: "uuid", nullable: true })
  sourcePurchaseOrderId: string | null;

  @ManyToOne(() => PurchaseOrder, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "sourcePurchaseOrderId" })
  sourcePurchaseOrder: PurchaseOrder | null;

  @Column({ type: "uuid", nullable: true })
  sourceReceiptId: string | null;

  @ManyToOne(() => PurchaseOrderReceipt, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "sourceReceiptId" })
  sourceReceipt: PurchaseOrderReceipt | null;

  @Column({ type: "varchar", default: "draft" })
  status: SupplierReturnStatus;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "varchar" })
  requestedByUserId: string;

  /** Set when HQ confirms the return against the supplier relationship */
  @Column({ type: "varchar", nullable: true })
  hqConfirmedByUserId: string | null;

  @Column({ type: "timestamptz", nullable: true })
  hqConfirmedAt: Date | null;

  @Column({ type: "text", nullable: true })
  hqConfirmationNotes: string | null;

  @Column({ type: "uuid", nullable: true })
  approvalInstanceId: string | null;

  /** Set when stock is physically dispatched (triggers inventory decrement) */
  @Column({ type: "timestamptz", nullable: true })
  dispatchedAt: Date | null;

  @Column({ type: "varchar", nullable: true })
  dispatchedByUserId: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(
    () => SupplierReturnLine,
    (line) => line.supplierReturn,
    { cascade: true },
  )
  lines: SupplierReturnLine[];
}
