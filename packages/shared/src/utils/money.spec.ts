import { describe, expect, it } from 'vitest';
import { formatCents, toCents } from './money';

describe('money', () => {
  it('converte formatos brasileiros para centavos', () => {
    expect(toCents('1.234,56')).toBe(123456);
    expect(toCents('R$ 10,5')).toBe(1050);
    expect(toCents(19.99)).toBe(1999);
  });

  it('formata centavos em BRL', () => {
    expect(formatCents(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
  });
});
