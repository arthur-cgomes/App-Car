import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import type { Expense } from './expense.entity';

@Entity('fuel_logs')
@Index('uq_fuel_logs_expense_id', ['expenseId'], { unique: true, where: '"deleted_at" IS NULL' })
export class FuelLog extends BaseEntity {
  @Column({ type: 'uuid' })
  expenseId: string;

  @OneToOne('Expense', (expense: Expense) => expense.fuel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expense_id' })
  expense?: Expense;

  @Column({ type: 'numeric', precision: 7, scale: 3, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  liters: number;

  @Column({ type: 'boolean', default: false })
  fullTank: boolean;
}
