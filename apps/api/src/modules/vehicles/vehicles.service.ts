import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Not, Repository } from 'typeorm';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { todayInBrazil } from '../../common/today';
import { Expense } from '../expenses/expense.entity';
import { PlateLookupService } from '../plate-lookup/plate-lookup.service';
import { ReminderSyncService } from '../reminders/reminder-sync.service';
import { User } from '../users/user.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { Vehicle } from './vehicle.entity';

const EMPTY_PLATE_DATA = {
  modelVersion: null as string | null,
  yearFab: null as number | null,
  yearModel: null as number | null,
  color: null as string | null,
  fuelType: null as string | null,
  municipality: null as string | null,
  uf: null as string | null,
  restrictions: null as string | null,
  fipeCode: null as string | null,
};

@Injectable()
export class VehiclesService extends BaseCrudService<Vehicle> {
  constructor(
    @InjectRepository(Vehicle) repository: Repository<Vehicle>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly plates: PlateLookupService,
    private readonly reminderSync: ReminderSyncService,
  ) {
    super(repository);
  }

  protected ownerScope(userId: string): FindOptionsWhere<Vehicle> {
    return { ownerId: userId };
  }

  list(userId: string) {
    return this.findAllOwned(userId, { order: { createdAt: 'ASC' } });
  }

  async create(userId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    const existing = await this.repository.findOne({ where: { plate: dto.plate, active: true } });
    if (existing) {
      throw new ConflictException(
        existing.ownerId === userId ? 'Este veículo já está na sua conta.' : 'Esta placa já está cadastrada em outra conta.',
      );
    }

    if (dto.purchaseOdometer != null && dto.purchaseOdometer > (dto.currentOdometer ?? 0)) {
      throw new BadRequestException('O odômetro na compra não pode ser maior que o atual.');
    }
    if (!dto.manual && !this.plates.available) throw new BadRequestException('Preencha os dados do veículo.');
    const data = dto.manual
      ? { ...EMPTY_PLATE_DATA, ...dto.manual }
      : { ...EMPTY_PLATE_DATA, ...(await this.plates.vehicle(userId, dto.plate)) };
    const vehicle = await this.repository.save(
      this.repository.create({
        ownerId: userId,
        plate: dto.plate,
        brand: data.brand,
        model: data.model,
        modelVersion: data.modelVersion,
        yearFab: data.yearFab,
        yearModel: data.yearModel,
        color: data.color,
        fuelType: data.fuelType,
        municipality: data.municipality,
        uf: data.uf,
        restrictions: data.restrictions,
        fipeCode: data.fipeCode,
        purchaseDate: dto.purchaseDate ?? null,
        purchaseOdometer: dto.purchaseOdometer ?? null,
        currentOdometer: dto.currentOdometer ?? 0,
        baseOdometer: dto.currentOdometer ?? 0,
      }),
    );
    await this.setActive(userId, vehicle.id);
    await this.reminderSync.sync(vehicle, dto.manual ? undefined : await this.plates.debts(userId, dto.plate));
    return vehicle;
  }

  async activate(userId: string, id: string) {
    const vehicle = await this.findOwned(userId, id);
    await this.setActive(userId, vehicle.id);
    return vehicle;
  }

  async updateOwned(userId: string, id: string, data: Parameters<BaseCrudService<Vehicle>['updateOwned']>[2]) {
    const { currentOdometer, fipeValueCents, ...rest } = data;
    const odometer =
      currentOdometer === undefined
        ? {}
        : { baseOdometer: currentOdometer, currentOdometer: Math.max(currentOdometer, await this.highestExpenseOdometer(id)) };
    const fipe =
      fipeValueCents === undefined
        ? {}
        : fipeValueCents === null
          ? { fipeValueCents: null, fipeRefMonth: null, fipeManual: false }
          : { fipeValueCents, fipeRefMonth: todayInBrazil().slice(0, 7), fipeManual: true };
    const vehicle = await super.updateOwned(userId, id, { ...rest, ...odometer, ...fipe });
    await this.reminderSync.sync(vehicle);
    return vehicle;
  }

  async refreshOdometer(vehicleId: string) {
    const vehicle = await this.repository.findOneByOrFail({ id: vehicleId });
    const next = Math.max(vehicle.baseOdometer, await this.highestExpenseOdometer(vehicleId));
    if (next === vehicle.currentOdometer) return vehicle;
    vehicle.currentOdometer = next;
    await this.repository.save(vehicle);
    await this.reminderSync.sync(vehicle);
    return vehicle;
  }

  private async highestExpenseOdometer(vehicleId: string) {
    const { max } = (await this.repository.manager
      .getRepository(Expense)
      .createQueryBuilder('expense')
      .select('max(expense.odometer)', 'max')
      .where('expense.vehicleId = :vehicleId', { vehicleId })
      .getRawOne<{ max: number | null }>())!;
    return Number(max ?? 0);
  }

  async removeOwned(userId: string, id: string): Promise<void> {
    await super.removeOwned(userId, id);
    const user = await this.users.findOneByOrFail({ id: userId });
    if (user.activeVehicleId === id) {
      const next = await this.repository.findOne({ where: { ownerId: userId, id: Not(id) }, order: { createdAt: 'ASC' } });
      await this.setActive(userId, next?.id ?? null);
    }
  }

  private async setActive(userId: string, vehicleId: string | null) {
    const user = await this.users.findOneByOrFail({ id: userId });
    if (user.activeVehicleId === vehicleId) return;
    user.activeVehicleId = vehicleId;
    await this.users.save(user);
  }
}
