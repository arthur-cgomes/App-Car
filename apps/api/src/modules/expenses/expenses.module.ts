import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesModule } from '../files/files.module';
import { RemindersModule } from '../reminders/reminders.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ExpenseAttachment } from './expense-attachment.entity';
import { ExpenseCategory } from './expense-category.entity';
import { Expense } from './expense.entity';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { FuelLog } from './fuel-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Expense, ExpenseCategory, ExpenseAttachment, FuelLog]), VehiclesModule, FilesModule, RemindersModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
