import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('expense_categories')
@Index('uq_expense_categories_code', ['code'], { unique: true, where: '"deleted_at" IS NULL' })
export class ExpenseCategory extends BaseEntity {
  @Column({ type: 'varchar', length: 30 })
  code: string;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  @Column({ type: 'varchar', length: 40 })
  icon: string;

  @Column({ type: 'varchar', length: 9 })
  color: string;

  @Column({ type: 'smallint', default: 0 })
  sortOrder: number;
}
