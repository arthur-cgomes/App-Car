import { EXPENSE_CATEGORIES } from '@monitoring-car/shared';
import { Repository } from 'typeorm';
import { ExpenseCategory } from '../../modules/expenses/expense-category.entity';

export async function seedExpenseCategories(repository: Repository<ExpenseCategory>) {
  let changed = 0;
  for (const [sortOrder, { code, name, icon, color }] of EXPENSE_CATEGORIES.entries()) {
    const existing = await repository.findOne({ where: { code } });
    if (
      existing &&
      existing.name === name &&
      existing.icon === icon &&
      existing.color === color &&
      existing.sortOrder === sortOrder
    ) {
      continue;
    }
    await repository.save(
      existing
        ? repository.merge(existing, { name, icon, color, sortOrder })
        : repository.create({ code, name, icon, color, sortOrder }),
    );
    changed++;
  }
  return changed;
}
