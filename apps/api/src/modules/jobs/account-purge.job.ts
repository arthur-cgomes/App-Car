import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Redis } from 'ioredis';
import { todayInBrazil } from '../../common/today';
import { REDIS } from '../../infra/redis/redis.constants';
import { AccountPurgeService } from '../account/account-purge.service';

@Injectable()
export class AccountPurgeJob {
  private readonly logger = new Logger('LimpezaLGPD');

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly purge: AccountPurgeService,
  ) {}

  @Cron('0 3 * * *', { timeZone: 'America/Sao_Paulo' })
  async scheduled() {
    const lock = await this.redis.set(`job:account-purge:${todayInBrazil()}`, '1', 'EX', 20 * 3600, 'NX');
    if (!lock) return;
    const purged = await this.purge.purgeExpired();
    if (purged) this.logger.log(`${purged} contas apagadas definitivamente`);
  }
}
