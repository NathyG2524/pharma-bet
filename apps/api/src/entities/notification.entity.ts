import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
@Entity({ name: "notifications" })
@Index("IDX_notifications_user", ["tenantId", "userId"])
@Index("IDX_notifications_event", ["tenantId", "userId", "eventKey"], { unique: true })
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  tenantId: string;

  @Column({ type: "uuid", nullable: true })
  branchId: string | null;

  @Column({ type: "varchar" })
  userId: string;

  @Column({ type: "varchar" })
  title: string;

  @Column({ type: "text" })
  body: string;

  @Column({ type: "varchar", nullable: true })
  link: string | null;

  @Column({ type: "varchar" })
  eventType: string;

  @Column({ type: "varchar" })
  eventKey: string;

  @Column({ type: "boolean", default: false })
  isRead: boolean;

  @Column({ type: "timestamptz", nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
