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
import { Medicine } from "./medicine.entity";
import { Supplier } from "./supplier.entity";

@Entity({ name: "supplier_products" })
@Index("UQ_supplier_products_tenant_supplier_medicine", ["tenantId", "supplierId", "medicineId"], {
  unique: true,
})
@Index("IDX_supplier_products_tenant_supplier", ["tenantId", "supplierId"])
@Index("IDX_supplier_products_tenant_medicine", ["tenantId", "medicineId"])
export class SupplierProduct {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @Column({ type: "uuid" })
  supplierId: string;

  @ManyToOne(
    () => Supplier,
    (supplier) => supplier.productMappings,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "supplierId" })
  supplier: Supplier;

  @Column({ type: "uuid" })
  medicineId: string;

  @ManyToOne(() => Medicine, { onDelete: "CASCADE" })
  @JoinColumn({ name: "medicineId" })
  medicine: Medicine;

  @Column({ type: "varchar", nullable: true })
  supplierSku: string | null;

  @Column({ type: "int", nullable: true })
  packSize: number | null;

  @Column({ type: "varchar", nullable: true })
  packUnit: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
