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
import { TaxCategory } from "./tax-category.entity";

@Entity({ name: "branch_tax_settings" })
@Index("UQ_branch_tax_settings_branch", ["branchId"], { unique: true })
export class BranchTaxSetting {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @Column({ type: "uuid" })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "branchId" })
  branch: Branch;

  @Column({ type: "uuid", nullable: true })
  defaultTaxCategoryId: string | null;

  @ManyToOne(() => TaxCategory, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "defaultTaxCategoryId" })
  defaultTaxCategory: TaxCategory | null;

  @Column({ type: "decimal", precision: 6, scale: 4, nullable: true })
  taxRateOverride: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
