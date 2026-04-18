import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "audit_events" })
@Index("IDX_audit_events_tenant_patient", ["tenantId", "patientId"])
@Index("IDX_audit_events_tenant_user", ["tenantId", "userId"])
export class AuditEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @Column({ type: "uuid", nullable: true })
  branchId: string | null;

  @Column({ type: "varchar" })
  userId: string;

  @Column({ type: "varchar" })
  action: string;

  @Column({ type: "uuid" })
  patientId: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
