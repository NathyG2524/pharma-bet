import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity({ name: "tenant_approval_policies" })
export class TenantApprovalPolicy {
  @PrimaryColumn({ type: "uuid" })
  tenantId: string;

  @OneToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant: Tenant;

  @Column({ type: "boolean", default: false })
  allowHqBreakGlass: boolean;

  @Column({ type: "boolean", default: false })
  allowCombinedHqForSingleBranch: boolean;

  @Column({ type: "boolean", default: false })
  allowCombinedHqWhenBmUnavailable: boolean;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
