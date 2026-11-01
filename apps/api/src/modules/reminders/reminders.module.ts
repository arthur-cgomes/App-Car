import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from '../expenses/expense.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Reminder } from './reminder.entity';
import { ReminderSyncService } from './reminder-sync.service';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reminder, Vehicle, Expense])],
  controllers: [RemindersController],
  providers: [RemindersService, ReminderSyncService],
  exports: [RemindersService, ReminderSyncService],
})
export class RemindersModule {}
