import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { MedicineOverlay } from "./medicine-overlay.entity";
import { MedicineTransaction } from "./medicine-transaction.entity";

@Entity({ name: "medicines" })
@Index("UQ_medicines_tenant_name", ["tenantId", "name"], { unique: true })
export class Medicine {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: "varchar", nullable: true })
  sku: string | null;

  @Column({ type: "varchar", nullable: true })
  unit: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(
    () => MedicineOverlay,
    (overlay) => overlay.medicine,
  )
  overlays: MedicineOverlay[];

  @OneToMany(
    () => MedicineTransaction,
    (t) => t.medicine,
  )
  transactions: MedicineTransaction[];
}
