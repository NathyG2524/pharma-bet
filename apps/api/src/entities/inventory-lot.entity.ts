import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Branch } from "./branch.entity";
import { Medicine } from "./medicine.entity";

export enum InventoryLotStatus {
  ACTIVE = "ACTIVE",
  QUARANTINE = "QUARANTINE",
  RECALLED = "RECALLED",
}

@Entity({ name: "inventory_lots" })
@Index(
  "UQ_inventory_lots_unique",
  ["tenantId", "branchId", "medicineId", "lotCode", "expiryDate", "unitCost"],
  { unique: true },
)
@Index("IDX_inventory_lots_tenant_branch_medicine", ["tenantId", "branchId", "medicineId"])
export class InventoryLot {
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
  medicineId: string;

  @ManyToOne(() => Medicine, { onDelete: "CASCADE" })
  @JoinColumn({ name: "medicineId" })
  medicine: Medicine;

  @Column({ type: "varchar" })
  lotCode: string;

  @Column({ type: "date" })
  expiryDate: string;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  unitCost: string;

  @Column({
    type: "enum",
    enum: InventoryLotStatus,
    enumName: "inventory_lot_status_enum",
    default: InventoryLotStatus.ACTIVE,
  })
  status: InventoryLotStatus;

  @Column({ type: "int", default: 0 })
  quantityOnHand: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
