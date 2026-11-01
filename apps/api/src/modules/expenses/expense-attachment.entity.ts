import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { StoredFile } from '../files/file.entity';
import type { Expense } from './expense.entity';

@Entity('expense_attachments')
@Index(['expenseId', 'position'])
export class ExpenseAttachment extends BaseEntity {
  @Column({ type: 'uuid' })
  expenseId: string;

  @ManyToOne('Expense', (expense: Expense) => expense.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expense_id' })
  expense?: Expense;

  @Column({ type: 'uuid' })
  fileId: string;

  @ManyToOne(() => StoredFile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'file_id' })
  file?: StoredFile;

  @Column({ type: 'smallint', default: 0 })
  position: number;
}
