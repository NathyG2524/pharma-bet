import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Medicine } from "./medicine.entity";
import { TransferLineAllocation } from "./transfer-line-allocation.entity";
import { Transfer } from "./transfer.entity";

@Entity({ name: "transfer_lines" })
@Index("IDX_transfer_lines_transfer", ["transferId"])
@Index("IDX_transfer_lines_medicine", ["medicineId"])
export class TransferLine {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  transferId: string;

  @ManyToOne(
    () => Transfer,
    (transfer) => transfer.lines,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "transferId" })
  transfer: Transfer;

  @Column({ type: "uuid" })
  medicineId: string;

  @ManyToOne(() => Medicine, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "medicineId" })
  medicine: Medicine;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "text", nullable: true })
  overrideReason: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @OneToMany(
    () => TransferLineAllocation,
    (allocation) => allocation.transferLine,
  )
  allocations: TransferLineAllocation[];
}
