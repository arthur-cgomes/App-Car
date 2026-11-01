const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatCents(cents: number): string {
  return brl.format(cents / 100);
}

export function toCents(value: string | number): number {
  if (typeof value === 'number') return Math.round(value * 100);
  const cleaned = value.replace(/[^\d,.-]/g, '');
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) throw new Error(`Valor monetário inválido: ${value}`);
  return Math.round(parsed * 100);
}
