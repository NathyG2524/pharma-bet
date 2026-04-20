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
import { Tenant } from "./tenant.entity";

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalDecision = "approved" | "rejected";
export type ApprovalLane = "bm" | "hq";

@Entity({ name: "approval_instances" })
@Index("IDX_approval_instances_tenant_status", ["tenantId", "status"])
@Index("IDX_approval_instances_domain", ["tenantId", "domainType", "domainId"])
export class ApprovalInstance {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant: Tenant;

  @Column({ type: "uuid", nullable: true })
  branchId: string | null;

  @ManyToOne(() => Branch, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "branchId" })
  branch: Branch | null;

  @Column({ type: "varchar" })
  domainType: string;

  @Column({ type: "varchar" })
  domainId: string;

  @Column({ type: "varchar" })
  requestedByUserId: string;

  @Column({ type: "varchar", default: "pending" })
  status: ApprovalStatus;

  @Column({ type: "varchar", nullable: true })
  bmDelegateUserId: string | null;

  @Column({ type: "boolean", default: false })
  bmUnavailable: boolean;

  @Column({ type: "text", nullable: true })
  breakGlassReason: string | null;

  @Column({ type: "timestamptz", nullable: true })
  breakGlassExpiresAt: Date | null;

  @Column({ type: "varchar", nullable: true })
  bmApproverUserId: string | null;

  @Column({ type: "varchar", nullable: true })
  bmDecision: ApprovalDecision | null;

  @Column({ type: "varchar", nullable: true })
  bmDecisionPath: string | null;

  @Column({ type: "text", nullable: true })
  bmDecisionReason: string | null;

  @Column({ type: "timestamptz", nullable: true })
  bmDecidedAt: Date | null;

  @Column({ type: "varchar", nullable: true })
  hqApproverUserId: string | null;

  @Column({ type: "varchar", nullable: true })
  hqDecision: ApprovalDecision | null;

  @Column({ type: "varchar", nullable: true })
  hqDecisionPath: string | null;

  @Column({ type: "text", nullable: true })
  hqDecisionReason: string | null;

  @Column({ type: "timestamptz", nullable: true })
  hqDecidedAt: Date | null;

  @Column({ type: "jsonb", default: () => "'{}'" })
  approvalPath: Record<string, unknown>;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
