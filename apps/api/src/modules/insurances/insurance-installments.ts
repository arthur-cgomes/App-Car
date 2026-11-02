import { addMonths } from '../reminders/reminder-rules';

export interface InstallmentPlan {
  installments: number | null;
  installmentCents: number | null;
  firstInstallmentNumber: number | null;
  firstInstallmentDate: string | null;
}

export function installmentSchedule(plan: InstallmentPlan) {
  if (!plan.installments || !plan.installmentCents || !plan.firstInstallmentDate) return [];
  const first = plan.firstInstallmentNumber ?? 1;
  return Array.from({ length: Math.max(plan.installments - first + 1, 0) }, (_, index) => ({
    number: first + index,
    date: addMonths(plan.firstInstallmentDate!, index),
  }));
}

export function dueInstallments(plan: InstallmentPlan, today: string) {
  return installmentSchedule(plan).filter((installment) => installment.date <= today);
}
