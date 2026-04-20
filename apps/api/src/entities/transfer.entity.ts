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
import { Tenant } from "./tenant.entity";
import { TransferLine } from "./transfer-line.entity";

export enum TransferStatus {
  DRAFT = "draft",
  IN_TRANSIT = "in_transit",
  RECEIVED = "received",
  RECEIVED_WITH_VARIANCE = "received_with_variance",
}

@Entity({ name: "transfers" })
@Index("IDX_transfers_tenant_source", ["tenantId", "sourceBranchId"])
@Index("IDX_transfers_tenant_destination", ["tenantId", "destinationBranchId"])
@Index("IDX_transfers_tenant_status", ["tenantId", "status"])
export class Transfer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant: Tenant;

  @Column({ type: "uuid" })
  sourceBranchId: string;

  @ManyToOne(() => Branch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sourceBranchId" })
  sourceBranch: Branch;

  @Column({ type: "uuid" })
  destinationBranchId: string;

  @ManyToOne(() => Branch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "destinationBranchId" })
  destinationBranch: Branch;

  @Column({
    type: "enum",
    enum: TransferStatus,
    enumName: "transfer_status_enum",
    default: TransferStatus.DRAFT,
  })
  status: TransferStatus;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "varchar", nullable: true })
  createdBy: string | null;

  @Column({ type: "varchar", nullable: true })
  shippedBy: string | null;

  @Column({ type: "varchar", nullable: true })
  receivedBy: string | null;

  @Column({ type: "timestamptz", nullable: true })
  shippedAt: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  receivedAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(
    () => TransferLine,
    (line) => line.transfer,
  )
  lines: TransferLine[];
}
