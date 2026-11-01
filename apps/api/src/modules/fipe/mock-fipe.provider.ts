import { Injectable } from '@nestjs/common';
import { todayInBrazil } from '../../common/today';
import { FipePrice, FipeProvider } from './fipe-provider';

@Injectable()
export class MockFipeProvider extends FipeProvider {
  calls = 0;

  async price(fipeCode: string, yearModel: number): Promise<FipePrice | null> {
    this.calls++;
    if (fipeCode !== '005476-3' || yearModel !== 2019) return null;
    return { priceCents: 7932600, referenceMonth: todayInBrazil().slice(0, 7), model: 'Polo Highline 200 TSI 1.0 Flex 12V Aut.' };
  }
}
