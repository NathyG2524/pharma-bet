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
@Index("IDX_purchase_order_lines_medicine", ["medicineId"])
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

  @ManyToOne(() => Medicine, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "medicineId" })
  medicine: Medicine;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 14, scale: 4, nullable: true })
  unitCost: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
