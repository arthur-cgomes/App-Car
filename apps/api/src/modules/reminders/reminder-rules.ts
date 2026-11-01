import type { ExpenseCategoryCode } from '@monitoring-car/shared';
import type { PlateDebt } from '../plate-lookup/plate-provider';
import type { ReminderSource } from './reminder.entity';

export interface AutoReminder {
  source: ReminderSource;
  sourceKey: string;
  categoryCode: ExpenseCategoryCode;
  title: string;
  dueDate: string | null;
  dueOdometer: number | null;
  amountCents: number | null;
}

export function nextServiceKm(odometer: number, intervalKm: number) {
  return (Math.floor(odometer / intervalKm) + 1) * intervalKm;
}

export function serviceReminder(odometer: number, intervalKm: number): AutoReminder {
  const km = nextServiceKm(odometer, intervalKm);
  return {
    source: 'AUTO_SERVICE',
    sourceKey: `SERVICE:${km}`,
    categoryCode: 'MAINTENANCE',
    title: `Revisão dos ${km.toLocaleString('pt-BR')} km`,
    dueDate: null,
    dueOdometer: km,
    amountCents: null,
  };
}

export function debtTitle(debt: Pick<PlateDebt, 'type' | 'description'>) {
  if (debt.type === 'FINE' || debt.type === 'OTHER') {
    const text = debt.description.replace(/\s*·\s*/, ' de ');
    return `Pagar ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
  }
  return `Pagar ${debt.description}`;
}

export function debtReminders(debts: PlateDebt[]): AutoReminder[] {
  return debts
    .filter((debt) => debt.status === 'OPEN')
    .map((debt) => ({
      source: 'AUTO_DEBT',
      sourceKey: `DEBT:${debt.externalId}`,
      categoryCode: debt.type === 'IPVA' || debt.type === 'LICENSING' ? 'DOCUMENTS' : 'FINES',
      title: debtTitle(debt),
      dueDate: debt.dueDate,
      dueOdometer: null,
      amountCents: debt.amountCents,
    }));
}

export function ipvaEstimate(debts: PlateDebt[], today: string): AutoReminder | null {
  const year = Number(today.slice(0, 4));
  const paid = debts.find((debt) => debt.type === 'IPVA' && debt.status === 'PAID' && debt.description.includes(String(year)));
  if (!paid) return null;
  return {
    source: 'AUTO_IPVA',
    sourceKey: `IPVA:${year + 1}`,
    categoryCode: 'DOCUMENTS',
    title: `IPVA ${year + 1}`,
    dueDate: `${year + 1}-01-31`,
    dueOdometer: null,
    amountCents: paid.amountCents,
  };
}

export function paidDebtKeys(debts: PlateDebt[]) {
  return new Set(debts.filter((debt) => debt.status === 'PAID').map((debt) => `DEBT:${debt.externalId}`));
}

export function addMonths(isoDate: string, months: number) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}
