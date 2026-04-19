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
import { PurchaseOrderLine } from "./purchase-order-line.entity";
import { PurchaseOrderReceipt } from "./purchase-order-receipt.entity";

export enum PurchaseOrderStatus {
  DRAFT = "DRAFT",
  APPROVED = "APPROVED",
  RECEIVED = "RECEIVED",
}

@Entity({ name: "purchase_orders" })
@Index("IDX_purchase_orders_tenant_branch", ["tenantId", "branchId"])
export class PurchaseOrder {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @Column({ type: "uuid" })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "branchId" })
  branch: Branch;

  @Column({ type: "varchar", nullable: true })
  orderNumber: string | null;

  @Column({
    type: "enum",
    enum: PurchaseOrderStatus,
    enumName: "purchase_order_status_enum",
    default: PurchaseOrderStatus.DRAFT,
  })
  status: PurchaseOrderStatus;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(
    () => PurchaseOrderLine,
    (line) => line.purchaseOrder,
  )
  lines: PurchaseOrderLine[];

  @OneToMany(
    () => PurchaseOrderReceipt,
    (receipt) => receipt.purchaseOrder,
  )
  receipts: PurchaseOrderReceipt[];
}
