import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type { Redis } from 'ioredis';
import { Repository } from 'typeorm';
import { todayInBrazil } from '../../common/today';
import { REDIS } from '../../infra/redis/redis.constants';
import { PlateLookupService } from '../plate-lookup/plate-lookup.service';
import { ReminderSyncService } from '../reminders/reminder-sync.service';
import { Vehicle } from '../vehicles/vehicle.entity';

@Injectable()
export class DailyRemindersJob {
  private readonly logger = new Logger('LembretesDiários');

  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly sync: ReminderSyncService,
    private readonly plates: PlateLookupService,
  ) {}

  @Cron('0 8 * * *', { timeZone: 'America/Sao_Paulo' })
  async scheduled() {
    const today = todayInBrazil();
    const lock = await this.redis.set(`job:daily-reminders:${today}`, '1', 'EX', 20 * 3600, 'NX');
    if (!lock) return;
    const result = await this.run(today);
    this.logger.log(`${result.vehicles} veículos sincronizados`);
  }

  async run(today: string) {
    const refreshDebts = new Date(`${today}T12:00:00Z`).getUTCDay() === 1;
    const vehicles = await this.vehicles.find({ where: { active: true } });
    for (const vehicle of vehicles) {
      try {
        const debts = refreshDebts && this.plates.available ? await this.plates.debts(null, vehicle.plate) : undefined;
        await this.sync.sync(vehicle, debts, today);
      } catch (error) {
        this.logger.warn(`Falha ao sincronizar ${vehicle.plate}: ${(error as Error).message}`);
      }
    }
    return { vehicles: vehicles.length };
  }
}
