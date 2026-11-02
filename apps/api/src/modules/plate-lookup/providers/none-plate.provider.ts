import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PlateDebt, PlateProvider, PlateVehicleData } from '../plate-provider';

export const PLATE_UNAVAILABLE = 'A consulta pela placa ainda não está disponível. Preencha os dados do veículo.';

@Injectable()
export class NonePlateProvider extends PlateProvider {
  override readonly available = false;
  readonly name = 'none';

  async lookupVehicle(): Promise<PlateVehicleData | null> {
    throw new ServiceUnavailableException(PLATE_UNAVAILABLE);
  }

  async lookupDebts(): Promise<PlateDebt[]> {
    throw new ServiceUnavailableException(PLATE_UNAVAILABLE);
  }
}
