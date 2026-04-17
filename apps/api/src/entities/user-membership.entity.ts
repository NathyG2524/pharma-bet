import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Branch } from "./branch.entity";
import { Tenant } from "./tenant.entity";

export enum UserRole {
  PLATFORM_ADMIN = "platform_admin",
  HQ_ADMIN = "hq_admin",
  HQ_USER = "hq_user",
  BRANCH_MANAGER = "branch_manager",
  BRANCH_USER = "branch_user",
}

@Entity({ name: "user_memberships" })
export class UserMembership {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @ManyToOne(
    () => Tenant,
    (tenant) => tenant.memberships,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "tenantId" })
  tenant: Tenant;

  @Column({ type: "uuid", nullable: true })
  branchId: string | null;

  @ManyToOne(
    () => Branch,
    (branch) => branch.memberships,
    { nullable: true, onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "branchId" })
  branch: Branch | null;

  @Column({ type: "varchar" })
  userId: string;

  @Column({
    type: "enum",
    enum: UserRole,
    enumName: "user_role_enum",
  })
  role: UserRole;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
