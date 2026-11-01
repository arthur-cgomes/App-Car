export function normalizeBrMobile(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length !== 11 || digits[2] !== '9' || digits.startsWith('0')) return null;
  return `+55${digits}`;
}

function localDigits(e164: string) {
  return e164.replace(/\D/g, '').slice(-11);
}

export function formatBrPhone(e164: string): string {
  const d = localDigits(e164);
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskBrPhone(e164: string): string {
  const d = localDigits(e164);
  return `(${d.slice(0, 2)}) •••••-${d.slice(7)}`;
}

export function formatBrPhoneInput(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
