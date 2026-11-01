import { EXPENSE_CATEGORY_BY_CODE, PART_SYSTEMS } from "@monitoring-car/shared";
import type { Expense } from "@/lib/api/expenses";
import type { Reminder, ReminderInput } from "@/lib/api/reminders";
import { MONTHS_SHORT, brl, km } from "@/lib/format";

const DAY = 86_400_000;
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

export function reminderDetail(reminder: Reminder, odometer: number) {
  if (reminder.doneAt) {
    const paid = reminder.source === "AUTO_DEBT" || reminder.source === "AUTO_IPVA";
    return `${paid ? "Pago" : "Concluído"} em ${ddmm(reminder.doneAt.slice(0, 10))}`;
  }
  if (reminder.dueOdometer) {
    const left = reminder.dueOdometer - odometer;
    return left >= 0 ? `Faltam ${km(left)}` : `Passou ${km(-left)}`;
  }
  if (reminder.source === "AUTO_IPVA" && reminder.amountCents && reminder.dueDate) {
    return `Estimativa ${brl(reminder.amountCents)} · ${MONTHS_SHORT[+reminder.dueDate.slice(5, 7) - 1]}/${reminder.dueDate.slice(0, 4)}`;
  }
  if (reminder.amountCents && reminder.dueDate) return `${brl(reminder.amountCents)} · vence ${ddmm(reminder.dueDate)}`;
  if (reminder.dueDate) return `Vence em ${ddmm(reminder.dueDate)}/${reminder.dueDate.slice(0, 4)}`;
  return "";
}

function daysLeft(reminder: Reminder, today: string, odometer: number, kmPerDay: number | null) {
  if (reminder.dueDate) return { days: daysBetween(today, reminder.dueDate), estimated: false };
  if (reminder.dueOdometer && kmPerDay) return { days: (reminder.dueOdometer - odometer) / kmPerDay, estimated: true };
  return null;
}

export function reminderWhen(reminder: Reminder, today: string, odometer: number, kmPerDay: number | null) {
  if (reminder.doneAt) return "Concluído";
  const left = daysLeft(reminder, today, odometer, kmPerDay);
  if (!left) return "";
  const days = Math.round(left.days);
  if (left.estimated) {
    if (days <= 0) return "Agora";
    return days <= 90 ? `~${Math.max(1, Math.round(days / 7))} semanas` : `~${Math.round(days / 30)} meses`;
  }
  if (days < 0) return days === -1 ? "Venceu ontem" : `Venceu há ${-days} dias`;
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days <= 45) return `Em ${days} dias`;
  const months = Math.round(days / 30);
  return months === 1 ? "Em 1 mês" : `Em ${months} meses`;
}

export function reminderUrgent(reminder: Reminder, today: string, odometer: number) {
  if (reminder.doneAt) return false;
  if (reminder.dueOdometer && reminder.dueOdometer - odometer <= 500) return true;
  return !!reminder.dueDate && daysBetween(today, reminder.dueDate) <= 15;
}

export function addMonths(iso: string, months: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export const MAINTENANCE_REMINDER_MONTHS = [3, 6, 12] as const;

export function maintenanceReminder(expense: Expense, months: number): ReminderInput {
  const generic = expense.description === EXPENSE_CATEGORY_BY_CODE.MAINTENANCE.name;
  const system = PART_SYSTEMS.find((item) => item.code === expense.partSystem)?.name;
  return {
    title: !generic ? expense.description : system ? `Manutenção: ${system}` : "Próxima manutenção",
    category: "MAINTENANCE",
    dueDate: addMonths(expense.date, months),
    dueOdometer: null,
    repeatMonths: null,
    repeatKm: null,
  };
}
