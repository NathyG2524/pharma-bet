import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MedicineTransaction } from './medicine-transaction.entity';

@Entity({ name: 'medicines' })
export class Medicine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  sku: string | null;

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  @Column({ type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => MedicineTransaction, (t) => t.medicine)
  transactions: MedicineTransaction[];
}
