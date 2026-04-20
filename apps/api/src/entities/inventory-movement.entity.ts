import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Branch } from "./branch.entity";
import { InventoryLot } from "./inventory-lot.entity";
import { Medicine } from "./medicine.entity";

export enum InventoryMovementType {
  RECEIPT = "RECEIPT",
  ADJUSTMENT = "ADJUSTMENT",
  STOCK_COUNT_VARIANCE = "STOCK_COUNT_VARIANCE",
  SUPPLIER_RETURN = "SUPPLIER_RETURN",
}

export enum InventoryMovementReferenceType {
  PURCHASE_ORDER_RECEIPT = "PURCHASE_ORDER_RECEIPT",
  MANUAL_RECEIPT = "MANUAL_RECEIPT",
  INVENTORY_ADJUSTMENT = "INVENTORY_ADJUSTMENT",
  STOCK_COUNT_VARIANCE = "STOCK_COUNT_VARIANCE",
  SUPPLIER_RETURN = "SUPPLIER_RETURN",
}

@Entity({ name: "inventory_movements" })
@Index("IDX_inventory_movements_tenant_branch_medicine", ["tenantId", "branchId", "medicineId"])
export class InventoryMovement {
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

  @Column({ type: "uuid" })
  lotId: string;

  @ManyToOne(() => InventoryLot, { onDelete: "CASCADE" })
  @JoinColumn({ name: "lotId" })
  lot: InventoryLot;

  @Column({
    type: "enum",
    enum: InventoryMovementType,
    enumName: "inventory_movement_type_enum",
  })
  type: InventoryMovementType;

  @Column({
    type: "enum",
    enum: InventoryMovementReferenceType,
    enumName: "inventory_movement_reference_enum",
  })
  referenceType: InventoryMovementReferenceType;

  @Column({ type: "uuid" })
  referenceId: string;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  unitCost: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
