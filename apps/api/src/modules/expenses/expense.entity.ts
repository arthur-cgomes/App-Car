import type { PartSystemCode } from '@monitoring-car/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { ExpenseAttachment } from './expense-attachment.entity';
import { ExpenseCategory } from './expense-category.entity';
import { FuelLog } from './fuel-log.entity';

export type ExpenseSource = 'MANUAL' | 'DEBT' | 'INSURANCE' | 'DOCUMENT' | 'API';

@Entity('expenses')
@Index(['vehicleId', 'date'])
@Index(['vehicleId', 'categoryId'])
@Index(['vehicleId', 'partSystem'], { where: '"part_system" IS NOT NULL' })
@Index('uq_expenses_vehicle_id_external_id', ['vehicleId', 'externalId'], { unique: true, where: '"external_id" IS NOT NULL AND "deleted_at" IS NULL' })
export class Expense extends BaseEntity {
  @Column({ type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;

  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => ExpenseCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category?: ExpenseCategory;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string | null;

  @Column({ type: 'integer' })
  amountCents: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'integer', nullable: true })
  odometer: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  occurredAt: Date | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  establishment: string | null;

  @Column({ type: 'integer', nullable: true })
  partsCents: number | null;

  @Column({ type: 'integer', nullable: true })
  laborCents: number | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  externalId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  partSystem: PartSystemCode | null;

  @Column({ type: 'varchar', length: 10, default: 'MANUAL' })
  source: ExpenseSource;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => ExpenseAttachment, (attachment) => attachment.expense)
  attachments?: ExpenseAttachment[];

  @OneToOne(() => FuelLog, (fuel) => fuel.expense)
  fuel?: FuelLog | null;
}
