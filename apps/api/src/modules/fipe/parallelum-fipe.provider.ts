import { Injectable, Logger } from '@nestjs/common';
import { FipePrice, FipeProvider, PlateFipe, parsePrice, parseReferenceMonth, parseYearModel } from './fipe-provider';

const BASE = 'https://fipe.parallelum.com.br/api/v2';

@Injectable()
export class ParallelumFipeProvider extends FipeProvider {
  private readonly logger = new Logger('FIPE');

  constructor(private readonly token?: string) {
    super();
  }

  async price(fipeCode: string, yearModel: number): Promise<FipePrice | null> {
    const years = await this.get<{ code: string }[]>(`/cars/${fipeCode}/years`);
    const year = years?.find((y) => y.code.startsWith(`${yearModel}-`));
    if (!year) return null;
    const data = await this.get<{ price: string; referenceMonth: string; model: string }>(`/cars/${fipeCode}/years/${year.code}`);
    const priceCents = data && parsePrice(data.price);
    const referenceMonth = data && parseReferenceMonth(data.referenceMonth);
    return priceCents && referenceMonth ? { priceCents, referenceMonth, model: data.model } : null;
  }

  async byPlate(plate: string): Promise<PlateFipe | null> {
    const data = await this.get<{ year?: string; fipePrices?: { codeFipe: string; model: string; price: string }[] }>(`/plates/${plate}`);
    const match = data?.fipePrices?.find((item) => item.codeFipe && parsePrice(item.price));
    if (!match) return null;
    return { fipeCode: match.codeFipe, model: match.model, yearModel: data?.year ? parseYearModel(data.year) : null, priceCents: parsePrice(match.price)! };
  }

  private async get<T>(path: string): Promise<T | null> {
    try {
      const response = await fetch(`${BASE}${path}`, {
        headers: this.token ? { 'X-Subscription-Token': this.token } : {},
        signal: AbortSignal.timeout(8000),
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as T;
    } catch (error) {
      this.logger.warn(`Consulta FIPE falhou (${path}): ${(error as Error).message}`);
      return null;
    }
  }
}
