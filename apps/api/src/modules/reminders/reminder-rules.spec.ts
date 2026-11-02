import { addMonths, debtReminders, debtTitle, ipvaEstimate, nextServiceKm, oilChangeReminder, paidDebtKeys, serviceReminder } from './reminder-rules';

const debt = (overrides: object) => ({
  type: 'FINE' as const,
  description: 'Multa · velocidade',
  amountCents: 13016,
  status: 'OPEN' as const,
  dueDate: '2026-11-10',
  externalId: 'X',
  ...overrides,
});

describe('regras de lembretes automáticos', () => {
  it('calcula a próxima revisão pelo intervalo', () => {
    expect(nextServiceKm(38420, 10000)).toBe(40000);
    expect(nextServiceKm(40000, 10000)).toBe(50000);
    expect(serviceReminder(38420, 10000)).toMatchObject({ sourceKey: 'SERVICE:40000', title: 'Revisão dos 40.000 km', dueOdometer: 40000 });
  });

  it('transforma débitos em aberto em lembretes com o texto do design', () => {
    expect(debtTitle(debt({}))).toBe('Pagar multa de velocidade');
    expect(debtTitle(debt({ type: 'LICENSING', description: 'Licenciamento 2026' }))).toBe('Pagar Licenciamento 2026');
    const reminders = debtReminders([debt({}), debt({ status: 'PAID', externalId: 'Y' })]);
    expect(reminders).toEqual([
      expect.objectContaining({ sourceKey: 'DEBT:X', categoryCode: 'FINES', amountCents: 13016, dueDate: '2026-11-10' }),
    ]);
    expect(paidDebtKeys([debt({ status: 'PAID', externalId: 'Y' })])).toEqual(new Set(['DEBT:Y']));
  });

  it('estima o IPVA do ano seguinte a partir do IPVA pago', () => {
    const paid = debt({ type: 'IPVA', description: 'IPVA 2026', amountCents: 198540, status: 'PAID' });
    expect(ipvaEstimate([paid], '2026-10-31')).toMatchObject({ sourceKey: 'IPVA:2027', title: 'IPVA 2027', dueDate: '2027-01-31', amountCents: 198540 });
    expect(ipvaEstimate([{ ...paid, status: 'OPEN' }], '2026-10-31')).toBeNull();
  });

  it('com valor FIPE, estima o IPVA em 4% dele, como na Ficha', () => {
    const paid = debt({ type: 'IPVA', description: 'IPVA 2026', amountCents: 198540, status: 'PAID' });
    expect(ipvaEstimate([paid], '2026-10-31', 7932600)).toMatchObject({ sourceKey: 'IPVA:2027', amountCents: 317304 });
    expect(ipvaEstimate([], '2026-10-31', 4375000)).toMatchObject({ title: 'IPVA 2027', dueDate: '2027-01-31', amountCents: 175000 });
  });

  it('troca de óleo: 6 meses ou 5 mil km, 1 ano ou 10 mil km', () => {
    expect(oilChangeReminder({ date: '2026-03-10', odometer: 40000 }, 5000)).toMatchObject({
      source: 'AUTO_OIL',
      title: 'Troca de óleo',
      dueDate: '2026-09-10',
      dueOdometer: 45000,
    });
    expect(oilChangeReminder({ date: '2026-03-10', odometer: 40000 }, 10000)).toMatchObject({ dueDate: '2027-03-10', dueOdometer: 50000 });
  });

  it('soma meses respeitando o fim do mês', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
  });
});
