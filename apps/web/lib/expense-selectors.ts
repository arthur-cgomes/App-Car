import {
  EXPENSE_CATEGORY_BY_CODE,
  PART_SYSTEMS,
  PART_SYSTEM_BY_CODE,
  type ExpenseCategoryCode,
  type PartSystemCode,
} from "@monitoring-car/shared";
import { km } from "@/lib/format";
import type { Expense } from "@/lib/api/expenses";

const sum = (expenses: Expense[]) => expenses.reduce((total, e) => total + e.amountCents, 0);
const inMonth = (expenses: Expense[], month: string) => expenses.filter((e) => e.date.startsWith(month));

export function expenseMeta(expense: Expense) {
  return [
    EXPENSE_CATEGORY_BY_CODE[expense.category].name,
    expense.partSystem && PART_SYSTEM_BY_CODE[expense.partSystem].name,
    expense.odometer && km(expense.odometer),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function monthsForNavigation(months: string[], currentMonth: string) {
  return [...new Set([currentMonth, ...months])].sort();
}

export function expensesForList(
  expenses: Expense[],
  month: string,
  category: ExpenseCategoryCode | "ALL",
  partSystem: PartSystemCode | null,
) {
  const inScope = inMonth(expenses, month).filter((e) => category === "ALL" || e.category === category);
  const list = inScope.filter((e) => !partSystem || e.partSystem === partSystem);

  const withParts = inScope.filter((e) => e.partSystem);
  const partsTotal = sum(withParts);
  const partSummary = PART_SYSTEMS.map((system) => ({
    code: system.code,
    name: system.name,
    cents: sum(withParts.filter((e) => e.partSystem === system.code)),
  }))
    .filter((p) => p.cents > 0)
    .sort((a, b) => b.cents - a.cents)
    .map((p) => ({ ...p, width: (p.cents / partsTotal) * 100 }));

  const groups: { date: string; items: Expense[] }[] = [];
  for (const expense of list) {
    const last = groups.at(-1);
    if (last?.date === expense.date) last.items.push(expense);
    else groups.push({ date: expense.date, items: [expense] });
  }

  return { list, total: sum(list), groups, partSummary, partsTotal };
}
