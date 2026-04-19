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
import { PurchaseOrder } from "./purchase-order.entity";

@Entity({ name: "purchase_order_lines" })
@Index("IDX_purchase_order_lines_po", ["purchaseOrderId"])
export class PurchaseOrderLine {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  purchaseOrderId: string;

  @ManyToOne(
    () => PurchaseOrder,
    (po) => po.lines,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "purchaseOrderId" })
  purchaseOrder: PurchaseOrder;

  @Column({ type: "uuid" })
  medicineId: string;

  @ManyToOne(() => Medicine, { onDelete: "CASCADE" })
  @JoinColumn({ name: "medicineId" })
  medicine: Medicine;

  @Column({ type: "int" })
  orderedQuantity: number;

  @Column({ type: "decimal", precision: 14, scale: 4, nullable: true })
  unitCost: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
