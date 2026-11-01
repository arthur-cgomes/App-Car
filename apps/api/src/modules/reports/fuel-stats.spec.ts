import { fuelStats } from './fuel-stats';

const fill = (id: string, odometer: number | null, liters: number, fullTank: boolean, amountCents = liters * 600) => ({
  expenseId: id,
  date: `2026-10-${id.padStart(2, '0')}`,
  odometer,
  liters,
  fullTank,
  amountCents,
});

describe('consumo (tanque cheio a tanque cheio)', () => {
  it('soma os abastecimentos parciais no trecho e ignora o primeiro tanque cheio', () => {
    const stats = fuelStats([fill('1', 37000, 40, true), fill('2', 37200, 15, false), fill('3', 37560, 25, true)]);
    expect(stats.averageKmPerLiter).toBe(14);
    expect(stats.fills[0]).toMatchObject({ expenseId: '3', kmPerLiter: 14, pricePerLiterCents: 600 });
    expect(stats.fills.find((f) => f.expenseId === '1')?.kmPerLiter).toBeNull();
    expect(stats.totalLiters).toBe(80);
  });

  it('sem dois tanques cheios não há consumo, mas há preço médio', () => {
    const stats = fuelStats([fill('1', 37000, 40, false, 24000)]);
    expect(stats.averageKmPerLiter).toBeNull();
    expect(stats.averagePricePerLiterCents).toBe(600);
  });
});
