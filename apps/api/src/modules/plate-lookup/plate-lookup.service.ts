import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Env } from '../../config/env';
import { RateLimiter } from '../../infra/redis/rate-limiter';
import { ReminderSyncService } from '../reminders/reminder-sync.service';
import { PlateLookupHistory } from './entities/plate-lookup-history.entity';
import { PlateLookup, PlateLookupKind } from './entities/plate-lookup.entity';
import { PlateDebt, PlateProvider, PlateVehicleData } from './plate-provider';

const TTL_SECONDS: Record<PlateLookupKind, number> = { VEHICLE: 24 * 3600, DEBTS: 6 * 3600 };
const HISTORY_SIZE = 4;
const NOT_FOUND = 'Não encontramos dados para esta placa.';

export interface PlateConsultation {
  plate: string;
  vehicle: PlateVehicleData;
  debts: PlateDebt[];
  openCents: number;
  checkedAt: string;
}

@Injectable()
export class PlateLookupService {
  private readonly dailyLimit: number;

  constructor(
    @InjectRepository(PlateLookup) private readonly cache: Repository<PlateLookup>,
    @InjectRepository(PlateLookupHistory) private readonly history: Repository<PlateLookupHistory>,
    private readonly provider: PlateProvider,
    private readonly limiter: RateLimiter,
    private readonly reminderSync: ReminderSyncService,
    config: ConfigService<Env, true>,
  ) {
    this.dailyLimit = config.get('PLATE_LOOKUP_DAILY_LIMIT', { infer: true });
  }

  get available() {
    return this.provider.available;
  }

  async vehicle(userId: string, plate: string): Promise<PlateVehicleData> {
    const vehicle = await this.cached(userId, plate, 'VEHICLE', () =>
      this.provider.lookupVehicle(plate),
    );
    if (!vehicle) throw new NotFoundException(NOT_FOUND);
    return vehicle;
  }

  async consult(userId: string, plate: string): Promise<PlateConsultation> {
    const vehicle = await this.vehicle(userId, plate);
    const debts = await this.debts(userId, plate);
    await this.reminderSync.syncDebtsForPlate(userId, plate, debts);
    await this.history.upsert({ userId, plate, updatedAt: new Date() }, ['userId', 'plate']);
    return {
      plate,
      vehicle,
      debts,
      openCents: debts
        .filter((d) => d.status === 'OPEN')
        .reduce((total, d) => total + d.amountCents, 0),
      checkedAt: new Date().toISOString(),
    };
  }

  async debts(userId: string | null, plate: string): Promise<PlateDebt[]> {
    return (
      (await this.cached(userId, plate, 'DEBTS', () => this.provider.lookupDebts(plate))) ?? []
    );
  }

  async recent(userId: string): Promise<string[]> {
    const rows = await this.history.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: HISTORY_SIZE,
    });
    return rows.map((row) => row.plate);
  }

  private async cached<T>(
    userId: string | null,
    plate: string,
    kind: PlateLookupKind,
    fetch: () => Promise<T>,
  ): Promise<T> {
    const hit = await this.cache.findOne({
      where: { plate, kind, provider: this.provider.name, expiresAt: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });
    if (hit) return hit.payload as T;

    if (userId)
      await this.limiter.consume(
        `plate-lookup:${userId}`,
        this.dailyLimit,
        24 * 3600,
        () => 'Você atingiu o limite de consultas de hoje. Tente novamente amanhã.',
      );
    const payload = await fetch();
    await this.cache.insert({
      plate,
      kind,
      provider: this.provider.name,
      payload: payload as object,
      expiresAt: new Date(Date.now() + TTL_SECONDS[kind] * 1000),
    });
    return payload;
  }
}
