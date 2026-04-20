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
import { StockCountVariance } from "./stock-count-variance.entity";

export type StockCountSessionStatus =
  | "open"
  | "submitted"
  | "approved"
  | "rejected"
  | "posted";

@Entity({ name: "stock_count_sessions" })
@Index("IDX_stock_count_sessions_tenant_branch", ["tenantId", "branchId"])
@Index("IDX_stock_count_sessions_approval", ["approvalInstanceId"])
export class StockCountSession {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @Column({ type: "uuid" })
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "branchId" })
  branch: Branch;

  @Column({ type: "varchar", default: "open" })
  status: StockCountSessionStatus;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "varchar" })
  openedByUserId: string;

  @Column({ type: "uuid", nullable: true })
  approvalInstanceId: string | null;

  @Column({ type: "timestamptz", nullable: true })
  submittedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  postedAt: Date | null;

  @Column({ type: "varchar", nullable: true })
  postedByUserId: string | null;

  @OneToMany(() => StockCountVariance, (v) => v.session, { cascade: false })
  variances: StockCountVariance[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
