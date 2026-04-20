import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Branch } from "./branch.entity";
import { PurchaseOrderReceiptLine } from "./purchase-order-receipt-line.entity";
import { PurchaseOrder } from "./purchase-order.entity";

@Entity({ name: "purchase_order_receipts" })
@Index("UQ_purchase_order_receipts_key", ["tenantId", "purchaseOrderId", "receiptKey"], {
  unique: true,
})
@Index("IDX_purchase_order_receipts_po", ["purchaseOrderId"])
export class PurchaseOrderReceipt {
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
  purchaseOrderId: string;

  @ManyToOne(
    () => PurchaseOrder,
    (po) => po.receipts,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "purchaseOrderId" })
  purchaseOrder: PurchaseOrder;

  @Column({ type: "varchar" })
  receiptKey: string;

  @Column({ type: "timestamptz" })
  receivedAt: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @OneToMany(
    () => PurchaseOrderReceiptLine,
    (line) => line.receipt,
  )
  lines: PurchaseOrderReceiptLine[];
}
