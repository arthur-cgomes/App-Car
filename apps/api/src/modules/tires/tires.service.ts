import { TIRE_POSITIONS, TIRE_SLOT_NAMES, isFrontTire, type TirePosition, type TireSlot } from '@monitoring-car/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { todayInBrazil } from '../../common/today';
import { ExpensesService } from '../expenses/expenses.service';
import { FilesService } from '../files/files.service';
import { ReminderSyncService } from '../reminders/reminder-sync.service';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
import { TireEvent, TireEventKind } from './tire-event.entity';
import { TireRotation } from './tire-rotation.entity';
import { OccurrenceDto, PressureDto, ReplaceTireDto, RotationDto, SetupTiresDto, TirePhotosDto, TireSettingsDto } from './tire.dto';
import { Tire } from './tire.entity';

const DEFAULT_LIFE_KM = 55000;
const SPARE_LIFE_KM = 10000;
const PRESSURE_MIN = 15;
const PRESSURE_MAX = 80;

@Injectable()
export class TiresService {
  constructor(
    @InjectRepository(Tire) private readonly tires: Repository<Tire>,
    @InjectRepository(TireEvent) private readonly events: Repository<TireEvent>,
    @InjectRepository(TireRotation) private readonly rotations: Repository<TireRotation>,
    @InjectRepository(Vehicle) private readonly vehicleRepository: Repository<Vehicle>,
    private readonly vehicles: VehiclesService,
    private readonly expenses: ExpensesService,
    private readonly files: FilesService,
    private readonly reminderSync: ReminderSyncService,
  ) {}

  async overview(userId: string, vehicleId: string) {
    const vehicle = await this.vehicles.findOwned(userId, vehicleId);
    const [tires, events, rotations] = await Promise.all([
      this.tires.find({ where: { vehicleId, position: Not(IsNull()) }, order: { number: 'ASC' } }),
      this.events.find({ where: { vehicleId }, order: { date: 'DESC', createdAt: 'DESC' } }),
      this.rotations.find({ where: { vehicleId }, order: { date: 'DESC', createdAt: 'DESC' }, take: 20 }),
    ]);
    return {
      odometer: vehicle.currentOdometer,
      settings: settingsOf(vehicle),
      lastRotationKm: vehicle.tireLastRotationKm,
      rotations: rotations.map(({ id, date, odometer, kind }) => ({ id, date, odometer, kind })),
      tires: tires.map((tire) => ({ ...tire, events: events.filter((event) => event.tireId === tire.id) })),
    };
  }

  async setup(userId: string, vehicleId: string, dto: SetupTiresDto) {
    const vehicle = await this.vehicles.findOwned(userId, vehicleId);
    if (await this.tires.countBy({ vehicleId, position: Not(IsNull()) })) throw new BadRequestException('Os pneus deste veículo já foram cadastrados.');
    if (dto.installedOdometer > vehicle.currentOdometer) throw new BadRequestException('O odômetro da instalação não pode ser maior que o atual.');
    this.applySettings(vehicle, dto.settings);
    const usedKm = vehicle.currentOdometer - dto.installedOdometer;
    for (const [index, position] of TIRE_POSITIONS.entries()) {
      const tire = await this.tires.save(
        this.tires.create({
          ...model(dto),
          vehicleId,
          number: index + 1,
          position,
          installedOdometer: dto.installedOdometer,
          installedDate: dto.installedDate,
          frontKm: isFrontTire(position) ? usedKm : 0,
          rearKm: isFrontTire(position) ? 0 : usedKm,
          baseOdometer: vehicle.currentOdometer,
        }),
      );
      await this.record(tire, 'INSTALLED', `Instalado no ${position}`, dto.installedDate, dto.installedOdometer);
    }
    if (dto.spareSize?.trim()) {
      const spare = await this.tires.save(
        this.tires.create({
          vehicleId,
          number: 0,
          position: 'EST',
          brand: dto.brand,
          model: 'Estepe',
          size: dto.spareSize.trim(),
          installedOdometer: dto.installedOdometer,
          installedDate: dto.installedDate,
          lifeKm: SPARE_LIFE_KM,
          baseOdometer: vehicle.currentOdometer,
          manufactureYear: dto.spareYear ?? null,
        }),
      );
      await this.record(spare, 'INSTALLED', 'Veio com o carro', dto.installedDate, dto.installedOdometer);
    }
    vehicle.tireLastRotationKm = dto.installedOdometer;
    await this.vehicleRepository.save(vehicle);
    await this.rotations.save(this.rotations.create({ vehicleId, date: dto.installedDate, odometer: dto.installedOdometer, kind: 'NEW_SET' }));
    await this.reminderSync.sync(vehicle);
    return this.overview(userId, vehicleId);
  }

  async updateSettings(userId: string, vehicleId: string, dto: TireSettingsDto) {
    const vehicle = await this.vehicles.findOwned(userId, vehicleId);
    this.applySettings(vehicle, dto);
    await this.vehicleRepository.save(vehicle);
    await this.reminderSync.sync(vehicle);
    return settingsOf(vehicle);
  }

  async calibrate(userId: string, vehicleId: string, dto: PressureDto) {
    const vehicle = await this.vehicles.findOwned(userId, vehicleId);
    const today = todayInBrazil();
    const tires = await this.active(vehicleId);
    for (const tire of tires) {
      const value = dto.values[tire.position as TireSlot];
      if (value === undefined) continue;
      if (typeof value !== 'number' || value < PRESSURE_MIN || value > PRESSURE_MAX) throw new BadRequestException('Informe uma pressão válida.');
    }
    for (const tire of tires) {
      const value = dto.values[tire.position as TireSlot];
      if (value === undefined) continue;
      tire.pressurePsi = value;
      await this.tires.save(tire);
      await this.record(tire, 'PRESSURE', `Calibrado: ${value.toLocaleString('pt-BR')} psi`, today, vehicle.currentOdometer, { pressurePsi: value });
    }
    vehicle.tireLastPressureDate = today;
    await this.vehicleRepository.save(vehicle);
    await this.reminderSync.sync(vehicle);
    return this.overview(userId, vehicleId);
  }

  async rotate(userId: string, vehicleId: string, dto: RotationDto) {
    const vehicle = await this.vehicles.findOwned(userId, vehicleId);
    const today = todayInBrazil();
    const tires = (await this.active(vehicleId)).filter((tire) => tire.position !== 'EST');
    const ids = new Set(tires.map((tire) => tire.id));
    const chosen = TIRE_POSITIONS.map((position) => dto.positions?.[position]);
    if (tires.length !== TIRE_POSITIONS.length || new Set(chosen).size !== TIRE_POSITIONS.length || chosen.some((id) => !ids.has(id))) {
      throw new BadRequestException('Escolha um pneu para cada posição.');
    }
    if (dto.odometer > vehicle.currentOdometer) await this.vehicles.updateOwned(userId, vehicleId, { currentOdometer: dto.odometer });
    const origin = new Map(tires.map((tire) => [tire.id, tire.position as TirePosition]));
    for (const tire of tires) {
      const from = origin.get(tire.id)!;
      const run = Math.max(0, dto.odometer - tire.baseOdometer);
      if (isFrontTire(from)) tire.frontKm += run;
      else tire.rearKm += run;
      tire.baseOdometer = dto.odometer;
      tire.position = null;
    }
    await this.tires.save(tires);
    for (const tire of tires) {
      const from = origin.get(tire.id)!;
      tire.position = TIRE_POSITIONS.find((position) => dto.positions[position] === tire.id)!;
      if (from !== tire.position) await this.record(tire, 'ROTATION', `Rodízio: ${from} → ${tire.position}`, today, dto.odometer);
    }
    await this.tires.save(tires);
    await this.rotations.save(this.rotations.create({ vehicleId, date: today, odometer: dto.odometer, kind: dto.kind }));
    const fresh = await this.vehicles.findOwned(userId, vehicleId);
    fresh.tireLastRotationKm = dto.odometer;
    await this.vehicleRepository.save(fresh);
    await this.reminderSync.sync(fresh);
    return this.overview(userId, vehicleId);
  }

  async addOccurrence(userId: string, vehicleId: string, dto: OccurrenceDto) {
    const vehicle = await this.vehicles.findOwned(userId, vehicleId);
    const tire = await this.at(vehicleId, dto.position);
    if (dto.fileId) await this.files.assertOwned(userId, [dto.fileId]);
    const today = todayInBrazil();
    const notes = dto.notes?.trim() || null;
    await this.record(tire, 'DAMAGE', `${dto.damageType} · ${dto.severity}`, today, vehicle.currentOdometer, {
      damageType: dto.damageType,
      severity: dto.severity,
      repaired: dto.repaired,
      costCents: dto.costCents || null,
      notes,
      fileId: dto.fileId ?? null,
    });
    if (dto.costCents) {
      await this.expenses.create(
        userId,
        vehicleId,
        { category: 'TIRES', amountCents: dto.costCents, date: today, description: `${dto.damageType} · ${dto.position}`, establishment: notes },
        { source: 'TIRE' },
      );
    }
    return this.overview(userId, vehicleId);
  }

  async markRepaired(userId: string, vehicleId: string, eventId: string) {
    await this.vehicles.findOwned(userId, vehicleId);
    const event = await this.events.findOneBy({ id: eventId, vehicleId, kind: 'DAMAGE' });
    if (!event) throw new NotFoundException('Ocorrência não encontrada');
    event.repaired = true;
    await this.events.save(event);
    return this.overview(userId, vehicleId);
  }

  async replace(userId: string, vehicleId: string, dto: ReplaceTireDto) {
    const vehicle = await this.vehicles.findOwned(userId, vehicleId);
    const current = await this.at(vehicleId, dto.position);
    const today = todayInBrazil();
    const spare = dto.position === 'EST';
    const last = await this.tires.find({ where: { vehicleId }, order: { number: 'DESC' }, take: 1, withDeleted: true });
    await this.record(current, 'REMOVED', `Retirado do ${dto.position}`, today, vehicle.currentOdometer);
    current.position = null;
    await this.tires.save(current);
    const tire = await this.tires.save(
      this.tires.create({
        ...model(dto),
        vehicleId,
        number: spare ? 0 : (last[0]?.number ?? 0) + 1,
        position: dto.position,
        installedOdometer: vehicle.currentOdometer,
        installedDate: today,
        baseOdometer: vehicle.currentOdometer,
        lifeKm: spare ? SPARE_LIFE_KM : (dto.lifeKm ?? DEFAULT_LIFE_KM),
      }),
    );
    await this.record(tire, 'INSTALLED', `Instalado no ${dto.position}`, today, vehicle.currentOdometer);
    if (dto.priceCents) {
      await this.expenses.create(
        userId,
        vehicleId,
        { category: 'TIRES', amountCents: dto.priceCents, date: today, description: `Pneu novo · ${dto.position}`, establishment: `${dto.brand} ${dto.model}`.slice(0, 120) },
        { source: 'TIRE' },
      );
    }
    return this.overview(userId, vehicleId);
  }

  async updatePhotos(userId: string, vehicleId: string, tireId: string, dto: TirePhotosDto) {
    await this.vehicles.findOwned(userId, vehicleId);
    const tire = await this.tires.findOneBy({ id: tireId, vehicleId });
    if (!tire) throw new NotFoundException('Pneu não encontrado');
    const ids = [dto.treadFileId, dto.sideFileId].filter((id): id is string => !!id);
    if (ids.length) await this.files.assertOwned(userId, ids);
    await this.tires.save(this.tires.merge(tire, dto));
    return this.overview(userId, vehicleId);
  }

  private applySettings(vehicle: Vehicle, dto?: TireSettingsDto) {
    if (!dto) return;
    vehicle.tireRotationKm = dto.rotationKm ?? vehicle.tireRotationKm;
    vehicle.tirePsiFront = dto.psiFront ?? vehicle.tirePsiFront;
    vehicle.tirePsiRear = dto.psiRear ?? vehicle.tirePsiRear;
    vehicle.tirePsiLoadedFront = dto.psiLoadedFront ?? vehicle.tirePsiLoadedFront;
    vehicle.tirePsiLoadedRear = dto.psiLoadedRear ?? vehicle.tirePsiLoadedRear;
    vehicle.tirePsiSpare = dto.psiSpare ?? vehicle.tirePsiSpare;
  }

  private active(vehicleId: string) {
    return this.tires.find({ where: { vehicleId, position: Not(IsNull()) } });
  }

  private async at(vehicleId: string, position: TireSlot) {
    const tire = await this.tires.findOneBy({ vehicleId, position });
    if (!tire) throw new NotFoundException(`${TIRE_SLOT_NAMES[position]} não cadastrado`);
    return tire;
  }

  private record(tire: Tire, kind: TireEventKind, description: string, date: string, odometer: number, extra: Partial<TireEvent> = {}) {
    return this.events.save(this.events.create({ vehicleId: tire.vehicleId, tireId: tire.id, kind, description, date, odometer, ...extra }));
  }
}

function model(dto: { brand: string; model: string; size: string; priceCents?: number | null; lifeKm?: number; store?: string | null }) {
  return {
    brand: dto.brand.trim(),
    model: dto.model.trim(),
    size: dto.size.trim(),
    priceCents: dto.priceCents ?? null,
    lifeKm: dto.lifeKm ?? DEFAULT_LIFE_KM,
    store: dto.store?.trim() || null,
  };
}

function settingsOf(vehicle: Vehicle) {
  return {
    rotationKm: vehicle.tireRotationKm,
    psiFront: vehicle.tirePsiFront,
    psiRear: vehicle.tirePsiRear,
    psiLoadedFront: vehicle.tirePsiLoadedFront,
    psiLoadedRear: vehicle.tirePsiLoadedRear,
    psiSpare: vehicle.tirePsiSpare,
  };
}
