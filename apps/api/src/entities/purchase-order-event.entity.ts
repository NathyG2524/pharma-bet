import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { PurchaseOrder } from "./purchase-order.entity";

@Entity({ name: "purchase_order_events" })
@Index("IDX_purchase_order_events_po", ["purchaseOrderId"])
@Index("IDX_purchase_order_events_tenant", ["tenantId"])
export class PurchaseOrderEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  purchaseOrderId: string;

  @ManyToOne(
    () => PurchaseOrder,
    (po) => po.events,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "purchaseOrderId" })
  purchaseOrder: PurchaseOrder;

  @Column({ type: "uuid" })
  tenantId: string;

  @Column({ type: "uuid" })
  branchId: string;

  @Column({ type: "varchar" })
  userId: string;

  @Column({ type: "varchar" })
  action: string;

  @Column({ type: "text", nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
