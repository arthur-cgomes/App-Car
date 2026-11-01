import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ExpenseCategoryCode } from '@monitoring-car/shared';
import { Repository } from 'typeorm';
import { Expense } from '../expenses/expense.entity';
import { ExpensesService } from '../expenses/expenses.service';
import { RemindersService } from '../reminders/reminders.service';
import { VehiclesService } from '../vehicles/vehicles.service';

const MONTHS_IN_CHART = 6;

export function monthsEndingAt(month: string, count: number) {
  const [year, m] = month.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, m - 1 - (count - 1 - index), 1));
    return date.toISOString().slice(0, 7);
  });
}

function monthBounds(month: string) {
  const [year, m] = month.split('-').map(Number);
  return { first: `${month}-01`, last: new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10) };
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
    private readonly expensesService: ExpensesService,
    private readonly reminders: RemindersService,
    private readonly vehicles: VehiclesService,
  ) {}

  async summary(userId: string, vehicleId: string, month: string) {
    const vehicle = await this.vehicles.findOwned(userId, vehicleId);
    const chartMonths = monthsEndingAt(month, MONTHS_IN_CHART);
    const { first } = monthBounds(chartMonths[0]);
    const { first: monthStart, last } = monthBounds(month);

    const totals: { month: string; cents: string }[] = await this.base(vehicleId)
      .select(`to_char(expense.date, 'YYYY-MM')`, 'month')
      .addSelect('sum(expense.amount_cents)', 'cents')
      .andWhere('expense.date BETWEEN :first AND :last', { first, last })
      .groupBy('month')
      .getRawMany();
    const byMonth = new Map(totals.map((row) => [row.month, Number(row.cents)]));
    const totalCents = byMonth.get(month) ?? 0;
    const previousCents = byMonth.get(chartMonths[MONTHS_IN_CHART - 2]) ?? 0;

    const categories: { code: ExpenseCategoryCode; cents: string }[] = await this.base(vehicleId)
      .innerJoin('expense.category', 'category')
      .select('category.code', 'code')
      .addSelect('sum(expense.amount_cents)', 'cents')
      .andWhere('expense.date BETWEEN :monthStart AND :last', { monthStart, last })
      .groupBy('category.code')
      .orderBy('cents', 'DESC')
      .getRawMany();

    const kmDriven = await this.kmDriven(vehicleId, monthStart, last);
    const [recent, upcoming] = await Promise.all([
      this.expensesService.list(userId, vehicleId, {}, 3),
      this.reminders.pending(userId, vehicleId, 3),
    ]);

    return {
      month,
      totalCents,
      previousCents,
      deltaPct: previousCents ? Math.round(((totalCents - previousCents) / previousCents) * 100) : null,
      kmDriven,
      costPerKmCents: kmDriven ? Math.round(totalCents / kmDriven) : null,
      odometer: vehicle.currentOdometer,
      categories: categories.map((row) => ({ code: row.code, cents: Number(row.cents) })),
      months: chartMonths.map((m) => ({ month: m, cents: byMonth.get(m) ?? 0 })),
      recent,
      upcoming,
    };
  }

  private async kmDriven(vehicleId: string, monthStart: string, last: string) {
    const inMonth: { min: string | null; max: string | null } | undefined = await this.base(vehicleId)
      .select('min(expense.odometer)', 'min')
      .addSelect('max(expense.odometer)', 'max')
      .andWhere('expense.odometer IS NOT NULL')
      .andWhere('expense.date BETWEEN :monthStart AND :last', { monthStart, last })
      .getRawOne();
    if (!inMonth?.max) return 0;
    const before: { max: string | null } | undefined = await this.base(vehicleId)
      .select('max(expense.odometer)', 'max')
      .andWhere('expense.odometer IS NOT NULL')
      .andWhere('expense.date < :monthStart', { monthStart })
      .getRawOne();
    const base = before?.max ? Number(before.max) : Number(inMonth.min);
    return Math.max(0, Number(inMonth.max) - base);
  }

  private base(vehicleId: string) {
    return this.expenses.createQueryBuilder('expense').where('expense.vehicle_id = :vehicleId', { vehicleId });
  }
}
