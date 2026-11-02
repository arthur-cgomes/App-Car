import { Injectable } from '@nestjs/common';
import { todayInBrazil } from '../../common/today';
import { FipePrice, FipeProvider, PlateFipe } from './fipe-provider';

@Injectable()
export class MockFipeProvider extends FipeProvider {
  calls = 0;
  plateCalls = 0;

  async price(fipeCode: string, yearModel: number): Promise<FipePrice | null> {
    this.calls++;
    if (fipeCode !== '005476-3' || yearModel !== 2019) return null;
    return { priceCents: 7932600, referenceMonth: todayInBrazil().slice(0, 7), model: 'Polo Highline 200 TSI 1.0 Flex 12V Aut.' };
  }

  async byPlate(plate: string): Promise<PlateFipe | null> {
    this.plateCalls++;
    if (plate !== 'FIP3E21') return null;
    return { fipeCode: '005476-3', model: 'Polo Highline 200 TSI 1.0 Flex 12V Aut.', yearModel: 2019, priceCents: 7932600 };
  }
}
