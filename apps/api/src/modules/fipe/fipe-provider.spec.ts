import { ipvaEstimateCents, parsePrice, parseReferenceMonth, parseYearModel } from './fipe-provider';

describe('respostas da FIPE', () => {
  it('converte preço e mês de referência', () => {
    expect(parsePrice('R$ 66.421,00')).toBe(6642100);
    expect(parseReferenceMonth('outubro de 2026')).toBe('2026-10');
    expect(parseReferenceMonth('Março de 2027')).toBe('2027-03');
    expect(parseReferenceMonth('xyz')).toBeNull();
  });

  it('lê o ano-modelo da consulta pela placa', () => {
    expect(parseYearModel('2019')).toBe(2019);
    expect(parseYearModel('2018/2019')).toBe(2019);
    expect(parseYearModel('')).toBeNull();
  });

  it('estima o IPVA em 4% do valor FIPE', () => {
    expect(ipvaEstimateCents(7932600)).toBe(317304);
    expect(ipvaEstimateCents(5000050)).toBe(200002);
  });
});
