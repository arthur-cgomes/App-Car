export function normalizeCpf(input: string): string {
  return input.replace(/\D/g, '');
}

export function isValidCpf(input: string): boolean {
  const cpf = normalizeCpf(input);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    const sum = [...cpf.slice(0, length)].reduce((total, d, i) => total + Number(d) * (length + 1 - i), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

const CPF_FORMAT = /^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/;

export function parseCpf(input: string): string | null {
  const value = input.trim();
  if (!CPF_FORMAT.test(value)) return null;
  const cpf = normalizeCpf(value);
  return isValidCpf(cpf) ? cpf : null;
}

export function formatCpf(input: string): string {
  const d = normalizeCpf(input).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
