import { monthsEndingAt } from './dashboard.service';

describe('monthsEndingAt', () => {
  it('lista os 6 meses do gráfico, inclusive virando o ano', () => {
    expect(monthsEndingAt('2026-10', 6)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(monthsEndingAt('2027-02', 3)).toEqual(['2026-12', '2027-01', '2027-02']);
  });
});
