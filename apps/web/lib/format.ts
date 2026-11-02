import { formatCents } from "@monitoring-car/shared";

export const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MONTHS_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export const brl = formatCents;
export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
export const km = (value: number) => `${value.toLocaleString("pt-BR")} km`;
export const formatKmInput = (raw: string) => {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 7);
  return digits ? Number(digits).toLocaleString("pt-BR") : "";
};
export const brTime = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export const longDate = (iso: string) => `${+iso.slice(8, 10)} de ${MONTHS_LONG[+iso.slice(5, 7) - 1]} de ${iso.slice(0, 4)}`;

export const dayHeader = (iso: string) => `${+iso.slice(8, 10)} de ${MONTHS_LONG[+iso.slice(5, 7) - 1]}`;

export const monthLabel = (month: string) => `${capitalize(MONTHS_LONG[+month.slice(5) - 1])} ${month.slice(0, 4)}`;

export const monthName = (month: string) => MONTHS_LONG[+month.slice(5) - 1];

export function previousMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  return m === 1 ? `${year - 1}-12` : `${year}-${String(m - 1).padStart(2, "0")}`;
}

const MONEY_FORMAT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const centsToMoneyInput = (cents: number) => MONEY_FORMAT.format(cents / 100);

export function formatMoneyInput(raw: string) {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
  return digits ? centsToMoneyInput(Number(digits)) : "";
}

export function parseMoneyInput(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  const value = Number(text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}
