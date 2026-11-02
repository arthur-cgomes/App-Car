export interface PlateVehicleData {
  brand: string;
  model: string;
  yearFab: number;
  yearModel: number;
  color: string;
  fuelType: string;
  municipality: string;
  uf: string;
  restrictions: string;
  fipeCode: string | null;
}

export type DebtType = 'IPVA' | 'LICENSING' | 'FINE' | 'OTHER';
export type DebtStatus = 'OPEN' | 'PAID';

export interface PlateDebt {
  type: DebtType;
  description: string;
  amountCents: number;
  status: DebtStatus;
  dueDate: string | null;
  externalId: string;
}

export abstract class PlateProvider {
  readonly available: boolean = true;
  abstract readonly name: string;
  abstract lookupVehicle(plate: string): Promise<PlateVehicleData | null>;
  abstract lookupDebts(plate: string): Promise<PlateDebt[]>;
}
