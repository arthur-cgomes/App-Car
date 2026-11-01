import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from '../expenses/expense.entity';
import { ExpensesModule } from '../expenses/expenses.module';
import { RemindersModule } from '../reminders/reminders.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Expense]), ExpensesModule, RemindersModule, VehiclesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
