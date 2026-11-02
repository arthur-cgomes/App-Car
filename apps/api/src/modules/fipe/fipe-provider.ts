export interface FipePrice {
  priceCents: number;
  referenceMonth: string;
  model: string;
}

export interface PlateFipe {
  fipeCode: string;
  model: string;
  yearModel: number | null;
  priceCents: number;
}

export abstract class FipeProvider {
  abstract price(fipeCode: string, yearModel: number): Promise<FipePrice | null>;
  abstract byPlate(plate: string): Promise<PlateFipe | null>;
}

export const IPVA_RATE = 0.04;

export function ipvaEstimateCents(fipeValueCents: number) {
  return Math.round(fipeValueCents * IPVA_RATE);
}

export function parseYearModel(text: string): number | null {
  const years = text.match(/\d{4}/g);
  return years ? Number(years[years.length - 1]) : null;
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
