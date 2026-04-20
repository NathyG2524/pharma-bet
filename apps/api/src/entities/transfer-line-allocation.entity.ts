import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { InventoryLot } from "./inventory-lot.entity";
import { TransferLine } from "./transfer-line.entity";

@Entity({ name: "transfer_line_allocations" })
@Index("IDX_transfer_line_allocations_line", ["transferLineId"])
@Index("IDX_transfer_line_allocations_lot", ["lotId"])
export class TransferLineAllocation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  transferLineId: string;

  @ManyToOne(
    () => TransferLine,
    (line) => line.allocations,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "transferLineId" })
  transferLine: TransferLine;

  @Column({ type: "uuid" })
  lotId: string;

  @ManyToOne(() => InventoryLot, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "lotId" })
  lot: InventoryLot;

  @Column({ type: "varchar" })
  lotCode: string;

  @Column({ type: "date" })
  expiryDate: string;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  unitCost: string;

  @Column({ type: "int" })
  quantityShipped: number;

  @Column({ type: "int", default: 0 })
  quantityReceived: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
