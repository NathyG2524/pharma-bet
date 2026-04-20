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
import { InventoryLot } from "./inventory-lot.entity";
import { Medicine } from "./medicine.entity";
import { SupplierReturn } from "./supplier-return.entity";

@Entity({ name: "supplier_return_lines" })
@Index("IDX_supplier_return_lines_return", ["returnId"])
@Index("IDX_supplier_return_lines_tenant_branch", ["tenantId", "branchId"])
export class SupplierReturnLine {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  returnId: string;

  @ManyToOne(
    () => SupplierReturn,
    (ret) => ret.lines,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "returnId" })
  supplierReturn: SupplierReturn;

  @Column({ type: "uuid" })
  tenantId: string;

  @Column({ type: "uuid" })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "branchId" })
  branch: Branch;

  @Column({ type: "uuid" })
  lotId: string;

  @ManyToOne(() => InventoryLot, { onDelete: "CASCADE" })
  @JoinColumn({ name: "lotId" })
  lot: InventoryLot;

  @Column({ type: "uuid" })
  medicineId: string;

  @ManyToOne(() => Medicine, { onDelete: "CASCADE" })
  @JoinColumn({ name: "medicineId" })
  medicine: Medicine;

  /** Always positive: units being returned to supplier */
  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
