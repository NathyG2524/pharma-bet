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
<<<<<<< HEAD
=======
import { User } from "./user.entity";

export enum InviteType {
  FIRST_HQ_ADMIN = "first_hq_admin",
  BRANCH_STAFF = "branch_staff",
}
>>>>>>> 1c3fc46 (feat(api): add accept-invite endpoint with token hash validation (#52))

@Entity({ name: "invites" })
export class Invite {
  @PrimaryGeneratedColumn("uuid")
  id: string;

<<<<<<< HEAD
  @Column({ type: "uuid" })
  tenantId: string;

  @ManyToOne(
    () => Tenant,
    { onDelete: "CASCADE" },
  )
=======
  @Column({
    type: "enum",
    enum: InviteType,
    enumName: "invite_type_enum",
  })
  type: InviteType;

  @Column({ type: "uuid" })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
>>>>>>> 1c3fc46 (feat(api): add accept-invite endpoint with token hash validation (#52))
  @JoinColumn({ name: "tenantId" })
  tenant: Tenant;

  @Column({ type: "uuid", nullable: true })
  branchId: string | null;

<<<<<<< HEAD
  @ManyToOne(
    () => Branch,
    { nullable: true, onDelete: "CASCADE" },
  )
=======
  @ManyToOne(() => Branch, { nullable: true, onDelete: "CASCADE" })
>>>>>>> 1c3fc46 (feat(api): add accept-invite endpoint with token hash validation (#52))
  @JoinColumn({ name: "branchId" })
  branch: Branch | null;

  @Column({ type: "varchar" })
  email: string;

<<<<<<< HEAD
  @Column({ type: "varchar", name: "tokenHash" })
  tokenHash: string;

=======
  @Column({ type: "varchar" })
  tokenHash: string;

  @Column({ type: "timestamptz" })
  expiresAt: Date;

  @Column({ type: "timestamptz", nullable: true })
  consumedAt: Date | null;

  @Column({ type: "uuid", nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "createdByUserId" })
  createdBy: User | null;

  @Column({ type: "timestamptz", nullable: true })
  revokedAt: Date | null;

>>>>>>> 1c3fc46 (feat(api): add accept-invite endpoint with token hash validation (#52))
  @Column({
    type: "enum",
    enum: UserRole,
    enumName: "user_role_enum",
  })
  role: UserRole;

<<<<<<< HEAD
  @Column({ type: "timestamptz", name: "expiresAt" })
  expiresAt: Date;

  @Column({ type: "timestamptz", nullable: true, name: "consumedAt" })
  consumedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true, name: "revokedAt" })
  revokedAt: Date | null;

  @Column({ type: "uuid", nullable: true, name: "createdByUserId" })
  createdByUserId: string | null;

=======
>>>>>>> 1c3fc46 (feat(api): add accept-invite endpoint with token hash validation (#52))
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
