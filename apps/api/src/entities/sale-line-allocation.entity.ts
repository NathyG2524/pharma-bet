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
import { SaleLine } from "./sale-line.entity";

@Entity({ name: "sale_line_allocations" })
@Index("IDX_sale_line_allocations_line", ["saleLineId"])
@Index("IDX_sale_line_allocations_lot", ["lotId"])
export class SaleLineAllocation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  saleLineId: string;

  @ManyToOne(
    () => SaleLine,
    (line) => line.allocations,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "saleLineId" })
  saleLine: SaleLine;

  @Column({ type: "uuid" })
  lotId: string;

  @ManyToOne(() => InventoryLot, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "lotId" })
  lot: InventoryLot;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  unitCost: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
