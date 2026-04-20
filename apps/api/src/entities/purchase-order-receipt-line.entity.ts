import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Medicine } from "./medicine.entity";
import { PurchaseOrderLine } from "./purchase-order-line.entity";
import { PurchaseOrderReceipt } from "./purchase-order-receipt.entity";

@Entity({ name: "purchase_order_receipt_lines" })
@Index("IDX_purchase_order_receipt_lines_receipt", ["receiptId"])
export class PurchaseOrderReceiptLine {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  receiptId: string;

  @ManyToOne(
    () => PurchaseOrderReceipt,
    (receipt) => receipt.lines,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "receiptId" })
  receipt: PurchaseOrderReceipt;

  @Column({ type: "uuid" })
  purchaseOrderLineId: string;

  @ManyToOne(() => PurchaseOrderLine, { onDelete: "CASCADE" })
  @JoinColumn({ name: "purchaseOrderLineId" })
  purchaseOrderLine: PurchaseOrderLine;

  @Column({ type: "uuid" })
  medicineId: string;

  @ManyToOne(() => Medicine, { onDelete: "CASCADE" })
  @JoinColumn({ name: "medicineId" })
  medicine: Medicine;

  @Column({ type: "varchar" })
  lotCode: string;

  @Column({ type: "date" })
  expiryDate: string;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  unitCost: string;

  @Column({ type: "text", nullable: true })
  expiryOverrideReason: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
