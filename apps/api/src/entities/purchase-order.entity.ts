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
import { PurchaseOrderEvent } from "./purchase-order-event.entity";
import { PurchaseOrderLine } from "./purchase-order-line.entity";
import { PurchaseOrderReceipt } from "./purchase-order-receipt.entity";
import { Supplier } from "./supplier.entity";
import { Tenant } from "./tenant.entity";

export enum PurchaseOrderStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  RECEIVED = "received",
  REJECTED = "rejected",
  CHANGES_REQUESTED = "changes_requested",
}

@Entity({ name: "purchase_orders" })
@Index("IDX_purchase_orders_tenant_branch", ["tenantId", "branchId"])
@Index("IDX_purchase_orders_tenant_status", ["tenantId", "status"])
export class PurchaseOrder {
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

  @Column({ type: "varchar", nullable: true })
  orderNumber: string | null;

  @Column({ type: "uuid", nullable: true })
  supplierId: string | null;

  @ManyToOne(() => Supplier, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "supplierId" })
  supplier: Supplier | null;

  @Column({
    type: "enum",
    enum: PurchaseOrderStatus,
    enumName: "purchase_order_status_enum",
    default: PurchaseOrderStatus.DRAFT,
  })
  status: PurchaseOrderStatus;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "varchar", nullable: true })
  createdBy: string | null;

  @Column({ type: "varchar", nullable: true })
  updatedBy: string | null;

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

  @OneToMany(
    () => PurchaseOrderEvent,
    (event) => event.purchaseOrder,
  )
  events: PurchaseOrderEvent[];
}
