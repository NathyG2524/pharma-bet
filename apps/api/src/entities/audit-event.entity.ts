import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity({ name: "audit_events" })
@Index("IDX_audit_events_tenant_created", ["tenantId", "createdAt"])
@Index("IDX_audit_events_tenant_entity", ["tenantId", "entityType"])
@Index("IDX_audit_events_tenant_patient", ["tenantId", "patientId"])
@Index("IDX_audit_events_tenant_actor", ["tenantId", "actorUserId"])
export class AuditEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant: Tenant;

  @Column({ type: "uuid", nullable: true })
  branchId: string | null;

  @Column({ type: "varchar" })
  actorUserId: string;

  @Column({ type: "varchar" })
  action: string;

  @Column({ type: "varchar" })
  entityType: string;

  @Column({ type: "varchar" })
  entityId: string;

  @Column({ type: "uuid", nullable: true })
  patientId: string | null;

  @Column({ type: "jsonb", default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
