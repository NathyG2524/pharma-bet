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
import { Tenant } from "./tenant.entity";
import { UserMembership } from "./user-membership.entity";

@Entity({ name: "branches" })
@Index("UQ_branches_tenant_name", ["tenantId", "name"], { unique: true })
export class Branch {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @ManyToOne(
    () => Tenant,
    (tenant) => tenant.branches,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "tenantId" })
  tenant: Tenant;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", nullable: true })
  code: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(
    () => UserMembership,
    (membership) => membership.branch,
  )
  memberships: UserMembership[];
}
