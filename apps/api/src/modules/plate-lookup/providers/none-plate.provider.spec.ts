import { NonePlateProvider } from './none-plate.provider';

describe('NonePlateProvider', () => {
  it('fica indisponível e recusa consultas', async () => {
    const provider = new NonePlateProvider();
    expect(provider.available).toBe(false);
    await expect(provider.lookupVehicle()).rejects.toThrow('Preencha os dados do veículo.');
    await expect(provider.lookupDebts()).rejects.toThrow('ainda não está disponível');
  });
});
