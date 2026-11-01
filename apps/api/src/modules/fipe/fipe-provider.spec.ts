import { parsePrice, parseReferenceMonth } from './fipe-provider';

describe('respostas da FIPE', () => {
  it('converte preço e mês de referência', () => {
    expect(parsePrice('R$ 66.421,00')).toBe(6642100);
    expect(parseReferenceMonth('outubro de 2026')).toBe('2026-10');
    expect(parseReferenceMonth('Março de 2027')).toBe('2027-03');
    expect(parseReferenceMonth('xyz')).toBeNull();
  });
});
