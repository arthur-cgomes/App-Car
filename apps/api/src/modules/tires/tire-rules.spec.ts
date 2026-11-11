import { parallelRotation, suggestedRotation, tireEquivalentKm } from '@monitoring-car/shared';

describe('regras de pneus', () => {
  it('na tração dianteira a frente gasta mais que a traseira', () => {
    const tire = { frontKm: 10000, rearKm: 10000, baseOdometer: 60000 };
    expect(tireEquivalentKm(tire, 'DE', 61000)).toBe(18000);
    expect(tireEquivalentKm(tire, 'TD', 61000)).toBe(17700);
  });

  it('ignora odômetro menor que a base', () => {
    expect(tireEquivalentKm({ frontKm: 0, rearKm: 0, baseOdometer: 500 }, 'DD', 100)).toBe(0);
  });

  it('sugere dianteiros direto para trás e traseiros cruzando para a frente', () => {
    expect(suggestedRotation({ DE: 'a', DD: 'b', TE: 'c', TD: 'd' })).toEqual({ DE: 'd', DD: 'c', TE: 'a', TD: 'b' });
  });

  it('o paralelo troca frente e trás do mesmo lado', () => {
    expect(parallelRotation({ DE: 'a', DD: 'b', TE: 'c', TD: 'd' })).toEqual({ DE: 'c', DD: 'd', TE: 'a', TD: 'b' });
  });
});
