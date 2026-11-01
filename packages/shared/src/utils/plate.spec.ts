import { describe, expect, it } from 'vitest';
import { formatPlate, isValidPlate, normalizePlate } from './plate';

describe('plate', () => {
  it('normaliza entrada do usuário', () => {
    expect(normalizePlate(' abc-1d23 ')).toBe('ABC1D23');
  });

  it('aceita padrão antigo e Mercosul', () => {
    expect(isValidPlate('ABC-1234')).toBe(true);
    expect(isValidPlate('abc1d23')).toBe(true);
  });

  it('rejeita placas inválidas', () => {
    expect(isValidPlate('AB12345')).toBe(false);
    expect(isValidPlate('ABC12D3')).toBe(false);
  });

  it('formata para exibição', () => {
    expect(formatPlate('abc1234')).toBe('ABC-1234');
    expect(formatPlate('abc1d23')).toBe('ABC1D23');
  });
});
