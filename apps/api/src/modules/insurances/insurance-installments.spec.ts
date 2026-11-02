import { dueInstallments, installmentSchedule } from './insurance-installments';

const plan = { installments: 24, installmentCents: 15550, firstInstallmentNumber: 11, firstInstallmentDate: '2026-11-10' };

describe('parcelas do seguro', () => {
  it('monta as parcelas restantes, uma por mês', () => {
    const schedule = installmentSchedule(plan);
    expect(schedule).toHaveLength(14);
    expect(schedule[0]).toEqual({ number: 11, date: '2026-11-10' });
    expect(schedule.at(-1)).toEqual({ number: 24, date: '2027-12-10' });
  });

  it('começa na primeira parcela quando o número não é informado', () => {
    expect(installmentSchedule({ ...plan, firstInstallmentNumber: null, installments: 2 })).toEqual([
      { number: 1, date: '2026-11-10' },
      { number: 2, date: '2026-12-10' },
    ]);
  });

  it('respeita o fim do mês', () => {
    expect(installmentSchedule({ ...plan, firstInstallmentNumber: 23, firstInstallmentDate: '2027-01-31' }).map((i) => i.date)).toEqual(['2027-01-31', '2027-02-28']);
  });

  it('só considera as parcelas cuja data já chegou', () => {
    expect(dueInstallments(plan, '2026-11-09')).toEqual([]);
    expect(dueInstallments(plan, '2027-01-10').map((i) => i.number)).toEqual([11, 12, 13]);
  });

  it('sem valor ou data da parcela, não há parcelas', () => {
    expect(installmentSchedule({ ...plan, installmentCents: null })).toEqual([]);
    expect(installmentSchedule({ ...plan, firstInstallmentDate: null })).toEqual([]);
  });
});
