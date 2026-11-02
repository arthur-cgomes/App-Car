import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from '../account/account.module';
import { InsurancesModule } from '../insurances/insurances.module';
import { PlateLookupModule } from '../plate-lookup/plate-lookup.module';
import { RemindersModule } from '../reminders/reminders.module';
import { Vehicle } from '../vehicles/vehicle.entity';
import { AccountPurgeJob } from './account-purge.job';
import { DailyRemindersJob } from './daily-reminders.job';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle]), RemindersModule, PlateLookupModule, AccountModule, InsurancesModule],
  providers: [DailyRemindersJob, AccountPurgeJob],
})
export class JobsModule {}
