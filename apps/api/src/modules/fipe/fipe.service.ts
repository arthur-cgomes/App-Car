import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Redis } from 'ioredis';
import { Repository } from 'typeorm';
import { todayInBrazil } from '../../common/today';
import { REDIS } from '../../infra/redis/redis.constants';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ReminderSyncService } from '../reminders/reminder-sync.service';
import { FipeProvider, ipvaEstimateCents } from './fipe-provider';

const PLATE_RETRY_SECONDS = 30 * 86_400;

@Injectable()
export class FipeService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    private readonly vehiclesService: VehiclesService,
    private readonly provider: FipeProvider,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly reminderSync: ReminderSyncService,
  ) {}

  async forVehicle(userId: string, vehicleId: string) {
    const vehicle = await this.vehiclesService.findOwned(userId, vehicleId);
    if (vehicle.fipeManual && vehicle.fipeValueCents) {
      await this.reminderSync.sync(vehicle);
      return this.result(vehicle, vehicle.fipeValueCents);
    }
    if (!vehicle.fipeCode) await this.fromPlate(vehicle);
    if (!vehicle.fipeCode) return { available: false as const };

    const fresh = vehicle.fipeValueCents && vehicle.fipeRefMonth === todayInBrazil().slice(0, 7);
    if (!fresh && vehicle.yearModel) {
      const price = await this.provider.price(vehicle.fipeCode, vehicle.yearModel);
      if (price) {
        vehicle.fipeValueCents = price.priceCents;
        vehicle.fipeRefMonth = price.referenceMonth;
        await this.vehicles.save(vehicle);
      }
    }
    if (!vehicle.fipeValueCents) return { available: false as const };
    await this.reminderSync.sync(vehicle);
    return this.result(vehicle, vehicle.fipeValueCents);
  }

  private result(vehicle: Vehicle, valueCents: number) {
    return {
      available: true as const,
      manual: vehicle.fipeManual,
      code: vehicle.fipeCode,
      valueCents,
      referenceMonth: vehicle.fipeRefMonth,
      ipvaEstimateCents: ipvaEstimateCents(valueCents),
    };
  }

  private async fromPlate(vehicle: Vehicle) {
    const first = await this.redis.set(`fipe-plate:${vehicle.plate}`, '1', 'EX', PLATE_RETRY_SECONDS, 'NX');
    if (!first) return;
    const found = await this.provider.byPlate(vehicle.plate);
    if (!found) return;
    vehicle.fipeCode = found.fipeCode;
    vehicle.yearModel ??= found.yearModel;
    vehicle.fipeValueCents = found.priceCents;
    vehicle.fipeRefMonth = todayInBrazil().slice(0, 7);
    await this.vehicles.save(vehicle);
  }
}
