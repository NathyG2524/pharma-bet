import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { SupplierProduct } from "./supplier-product.entity";

@Entity({ name: "suppliers" })
@Index("UQ_suppliers_tenant_name", ["tenantId", "name"], { unique: true })
@Index("IDX_suppliers_tenant", ["tenantId"])
export class Supplier {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: "varchar", nullable: true })
  contactEmail: string | null;

  @Column({ type: "varchar", nullable: true })
  contactPhone: string | null;

  @Column({ type: "varchar", nullable: true })
  address: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(
    () => SupplierProduct,
    (mapping) => mapping.supplier,
  )
  productMappings: SupplierProduct[];
}
