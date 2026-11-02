import { describe, expect, it } from 'vitest';
import { formatCpf, isValidCpf, normalizeCpf, parseCpf } from './cpf';

describe('cpf', () => {
  it('valida dígitos verificadores', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('52998224726')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('123')).toBe(false);
  });

  it('normaliza e formata', () => {
    expect(normalizeCpf('529.982.247-25')).toBe('52998224725');
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
    expect(formatCpf('5299')).toBe('529.9');
  });

  it('aceita só CPF real, com ou sem máscara, e devolve só os dígitos', () => {
    expect(parseCpf('529.982.247-25')).toBe('52998224725');
    expect(parseCpf(' 52998224725 ')).toBe('52998224725');
    expect(parseCpf('12345678901')).toBeNull();
    expect(parseCpf('000.000.000-00')).toBeNull();
    expect(parseCpf('529982247-25')).toBeNull();
    expect(parseCpf('529.982.247-25a')).toBeNull();
    expect(parseCpf('5299822472')).toBeNull();
  });
});
