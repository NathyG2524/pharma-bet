import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Branch } from "./branch.entity";
import { MedicineTransaction } from "./medicine-transaction.entity";

@Entity({ name: "medicines" })
@Index("UQ_medicines_tenant_branch_name", ["tenantId", "branchId", "name"], { unique: true })
export class Medicine {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @Column({ type: "uuid" })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "branchId" })
  branch: Branch;

  @Column()
  name: string;

  @Column({ type: "varchar", nullable: true })
  sku: string | null;

  @Column({ type: "varchar", nullable: true })
  unit: string | null;

  @Column({ type: "int", default: 0 })
  stockQuantity: number;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(
    () => MedicineTransaction,
    (t) => t.medicine,
  )
  transactions: MedicineTransaction[];
}
