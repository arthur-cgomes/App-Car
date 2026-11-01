import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilesService } from '../files/files.service';
import { ReminderSyncService } from '../reminders/reminder-sync.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { SaveInsuranceDto } from './insurance.dto';
import { Insurance } from './insurance.entity';

const reminderKey = (insurance: Insurance) => `INSURANCE:${insurance.id}`;

@Injectable()
export class InsurancesService {
  constructor(
    @InjectRepository(Insurance) private readonly insurances: Repository<Insurance>,
    private readonly vehicles: VehiclesService,
    private readonly files: FilesService,
    private readonly reminderSync: ReminderSyncService,
  ) {}

  async list(userId: string, vehicleId: string) {
    await this.vehicles.findOwned(userId, vehicleId);
    return this.insurances.find({ where: { vehicleId }, order: { endDate: 'DESC' } });
  }

  async create(userId: string, vehicleId: string, dto: SaveInsuranceDto) {
    await this.vehicles.findOwned(userId, vehicleId);
    await this.validate(userId, dto);
    const insurance = await this.insurances.save(this.insurances.create({ vehicleId, ...normalized(dto) }));
    await this.syncReminder(insurance);
    return insurance;
  }

  async update(userId: string, vehicleId: string, id: string, dto: SaveInsuranceDto) {
    const insurance = await this.owned(userId, vehicleId, id);
    await this.validate(userId, dto);
    const saved = await this.insurances.save(this.insurances.merge(insurance, normalized(dto)));
    await this.syncReminder(saved);
    return saved;
  }

  async remove(userId: string, vehicleId: string, id: string) {
    const insurance = await this.owned(userId, vehicleId, id);
    await this.insurances.softRemove(insurance);
    await this.reminderSync.removeAuto(vehicleId, reminderKey(insurance));
  }

  private syncReminder(insurance: Insurance) {
    return this.reminderSync.upsertAuto(insurance.vehicleId, {
      source: 'AUTO_INSURANCE',
      sourceKey: reminderKey(insurance),
      categoryCode: 'INSURANCE',
      title: 'Renovar seguro',
      dueDate: insurance.endDate,
      dueOdometer: null,
      amountCents: null,
    });
  }

  private async validate(userId: string, dto: SaveInsuranceDto) {
    if (dto.endDate <= dto.startDate) throw new BadRequestException('O fim da vigência deve ser depois do início.');
    if (dto.fileId) await this.files.assertOwned(userId, [dto.fileId]);
  }

  private async owned(userId: string, vehicleId: string, id: string) {
    const insurance = await this.insurances.findOne({ where: { id, vehicleId, vehicle: { ownerId: userId } } });
    if (!insurance) throw new NotFoundException('Apólice não encontrada');
    return insurance;
  }
}

function normalized(dto: SaveInsuranceDto) {
  return {
    insurer: dto.insurer,
    policyNumber: dto.policyNumber ?? null,
    startDate: dto.startDate,
    endDate: dto.endDate,
    premiumCents: dto.premiumCents ?? null,
    installments: dto.installments ?? null,
    deductibleCents: dto.deductibleCents ?? null,
    brokerContact: dto.brokerContact ?? null,
    fileId: dto.fileId ?? null,
  };
}
