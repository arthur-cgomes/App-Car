export interface FipePrice {
  priceCents: number;
  referenceMonth: string;
  model: string;
}

export abstract class FipeProvider {
  abstract price(fipeCode: string, yearModel: number): Promise<FipePrice | null>;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function parseReferenceMonth(text: string): string | null {
  const match = /^(\p{L}+) de (\d{4})$/u.exec(text.trim().toLowerCase());
  const index = match ? MONTHS.indexOf(match[1]) : -1;
  return index >= 0 ? `${match![2]}-${String(index + 1).padStart(2, '0')}` : null;
}

export function parsePrice(text: string): number | null {
  const digits = text.replace(/[^\d,]/g, '').replace(',', '.');
  const value = Number(digits);
  return digits && Number.isFinite(value) ? Math.round(value * 100) : null;
}
