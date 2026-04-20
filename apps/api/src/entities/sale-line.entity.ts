import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Medicine } from "./medicine.entity";
import { SaleLineAllocation } from "./sale-line-allocation.entity";
import { Sale } from "./sale.entity";

@Entity({ name: "sale_lines" })
@Index("IDX_sale_lines_sale", ["saleId"])
@Index("IDX_sale_lines_medicine", ["medicineId"])
export class SaleLine {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  saleId: string;

  @ManyToOne(
    () => Sale,
    (sale) => sale.lines,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "saleId" })
  sale: Sale;

  @Column({ type: "uuid" })
  medicineId: string;

  @ManyToOne(() => Medicine, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "medicineId" })
  medicine: Medicine;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  unitPrice: string;

  @Column({ type: "decimal", precision: 14, scale: 4, nullable: true })
  taxBase: string | null;

  @Column({ type: "decimal", precision: 6, scale: 4, nullable: true })
  taxRate: string | null;

  @Column({ type: "decimal", precision: 14, scale: 4, nullable: true })
  taxAmount: string | null;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  lineSubtotal: string;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  lineTotal: string;

  @Column({ type: "decimal", precision: 14, scale: 4 })
  cogsAmount: string;

  @Column({ type: "text", nullable: true })
  overrideReason: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @OneToMany(
    () => SaleLineAllocation,
    (allocation) => allocation.saleLine,
  )
  allocations: SaleLineAllocation[];
}
