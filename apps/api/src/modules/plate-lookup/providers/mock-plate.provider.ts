import { Injectable } from '@nestjs/common';
import { addDays as addDaysTo, todayInBrazil } from '../../../common/today';
import { PlateDebt, PlateProvider, PlateVehicleData } from '../plate-provider';

const MODELS = [
  ['Volkswagen', 'Polo Highline 1.0 TSI', 2021, 2022, 'Branco'],
  ['Fiat', 'Argo Drive 1.0', 2020, 2020, 'Vermelho'],
  ['Hyundai', 'HB20 Comfort 1.0', 2019, 2020, 'Preto'],
  ['Toyota', 'Corolla XEi 2.0', 2023, 2023, 'Cinza'],
] as const;
const PLACES = [
  ['São Paulo', 'SP'],
  ['Belo Horizonte', 'MG'],
  ['Curitiba', 'PR'],
  ['Salvador', 'BA'],
] as const;

@Injectable()
export class MockPlateProvider extends PlateProvider {
  readonly name = 'mock';

  async lookupVehicle(plate: string): Promise<PlateVehicleData | null> {
    if (plate.startsWith('ZZZ')) return null;
    if (plate === 'RIO2A18') {
      return {
        brand: 'Volkswagen',
        model: 'Polo Highline 1.0 200 TSI',
        yearFab: 2019,
        yearModel: 2019,
        color: 'Prata',
        fuelType: 'Flex',
        municipality: 'Rio de Janeiro',
        uf: 'RJ',
        restrictions: 'Sem restrições',
        fipeCode: '005476-3',
      };
    }
    const seed = seedOf(plate);
    const [brand, model, yearFab, yearModel, color] = MODELS[seed % 4];
    const [municipality, uf] = PLACES[seed % 4];
    return { brand, model, yearFab, yearModel, color, fuelType: 'Flex', municipality, uf, restrictions: 'Sem restrições', fipeCode: null };
  }

  async lookupDebts(plate: string): Promise<PlateDebt[]> {
    if (plate.startsWith('ZZZ')) return [];
    const year = todayInBrazil().slice(0, 4);
    if (plate === 'RIO2A18') {
      return [
        debt(plate, 'IPVA', `IPVA ${year}`, 198540, 'PAID'),
        debt(plate, 'LICENSING', `Licenciamento ${year}`, 16022, 'PAID'),
        debt(plate, 'FINE', 'Multa · velocidade', 13016, 'OPEN', addDaysTo(todayInBrazil(), 10)),
      ];
    }
    const seed = seedOf(plate);
    const debts = [
      debt(plate, 'IPVA', `IPVA ${year}`, 120000 + (seed % 9) * 11000, 'PAID'),
      debt(plate, 'LICENSING', `Licenciamento ${year}`, 16022, seed % 3 === 0 ? 'OPEN' : 'PAID'),
    ];
    if (seed % 2) debts.push(debt(plate, 'FINE', 'Multa · sinal vermelho', 29347, 'OPEN', addDaysTo(todayInBrazil(), 20)));
    return debts;
  }
}

function seedOf(plate: string) {
  return [...plate].reduce((total, char) => total + char.charCodeAt(0), 0);
}

function debt(plate: string, type: PlateDebt['type'], description: string, amountCents: number, status: PlateDebt['status'], dueDate: string | null = null): PlateDebt {
  return { type, description, amountCents, status, dueDate, externalId: `${plate}-${type}-${description}` };
}
