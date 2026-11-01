import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { todayInBrazil } from '../../common/today';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
import { FipeProvider } from './fipe-provider';

@Injectable()
export class FipeService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    private readonly vehiclesService: VehiclesService,
    private readonly provider: FipeProvider,
  ) {}

  async forVehicle(userId: string, vehicleId: string) {
    const vehicle = await this.vehiclesService.findOwned(userId, vehicleId);
    if (!vehicle.fipeCode || !vehicle.yearModel) return { available: false as const };

    const fresh = vehicle.fipeValueCents && vehicle.fipeRefMonth === todayInBrazil().slice(0, 7);
    if (!fresh) {
      const price = await this.provider.price(vehicle.fipeCode, vehicle.yearModel);
      if (price) {
        vehicle.fipeValueCents = price.priceCents;
        vehicle.fipeRefMonth = price.referenceMonth;
        await this.vehicles.save(vehicle);
      }
    }
    if (!vehicle.fipeValueCents) return { available: false as const };
    return { available: true as const, code: vehicle.fipeCode, valueCents: vehicle.fipeValueCents, referenceMonth: vehicle.fipeRefMonth };
  }
}
