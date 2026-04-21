import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Branch } from "./branch.entity";
import { Tenant } from "./tenant.entity";
import { UserRole } from "./user-membership.entity";

@Entity({ name: "invites" })
export class Invite {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @ManyToOne(
    () => Tenant,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "tenantId" })
  tenant: Tenant;

  @Column({ type: "uuid", nullable: true })
  branchId: string | null;

  @ManyToOne(
    () => Branch,
    { nullable: true, onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "branchId" })
  branch: Branch | null;

  @Column({ type: "varchar" })
  email: string;

  @Column({ type: "varchar", name: "tokenHash" })
  tokenHash: string;

  @Column({
    type: "enum",
    enum: UserRole,
    enumName: "user_role_enum",
  })
  role: UserRole;

  @Column({ type: "timestamptz", name: "expiresAt" })
  expiresAt: Date;

  @Column({ type: "timestamptz", nullable: true, name: "consumedAt" })
  consumedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true, name: "revokedAt" })
  revokedAt: Date | null;

  @Column({ type: "uuid", nullable: true, name: "createdByUserId" })
  createdByUserId: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
