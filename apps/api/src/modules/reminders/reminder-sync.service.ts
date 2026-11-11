import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { todayInBrazil } from '../../common/today';
import type { PlateDebt } from '../plate-lookup/plate-provider';
import { Expense } from '../expenses/expense.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Reminder } from './reminder.entity';
import { AutoReminder, OIL_CHANGE_PATTERN, debtReminders, ipvaEstimate, oilChangeReminder, paidDebtKeys, pressureReminder, rotationReminder, serviceReminder } from './reminder-rules';

@Injectable()
export class ReminderSyncService {
  constructor(
    @InjectRepository(Reminder) private readonly reminders: Repository<Reminder>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
  ) {}

  async sync(vehicle: Vehicle, debts?: PlateDebt[], today = todayInBrazil()) {
    const existing = await this.reminders.find({ where: { vehicleId: vehicle.id, sourceKey: Not(IsNull()) } });
    const byKey = new Map(existing.map((reminder) => [reminder.sourceKey!, reminder]));
    const desired: AutoReminder[] = [];

    const service = serviceReminder(vehicle.currentOdometer, vehicle.serviceIntervalKm);
    const pendingServices = existing.filter((r) => r.source === 'AUTO_SERVICE' && !r.doneAt && r.dueOdometer! > vehicle.currentOdometer);
    const beyond = pendingServices.filter((r) => r.dueOdometer! > service.dueOdometer!);
    if (beyond.length) {
      await this.reminders.softRemove(beyond);
      beyond.forEach((r) => byKey.delete(r.sourceKey!));
    }
    if (pendingServices.length === beyond.length) desired.push(service);

    const oil = oilChangeReminder(await this.lastOilChange(vehicle, today), vehicle.oilChangeIntervalKm);
    const staleOil = existing.filter((r) => r.source === 'AUTO_OIL' && !r.doneAt && r.sourceKey !== oil.sourceKey);
    if (staleOil.length) {
      await this.reminders.softRemove(staleOil);
      staleOil.forEach((r) => byKey.delete(r.sourceKey!));
    }
    desired.push(oil);

    const tireReminders = [
      ...(vehicle.tireLastRotationKm !== null ? [rotationReminder(vehicle.tireLastRotationKm, vehicle.tireRotationKm)] : []),
      ...(vehicle.tireLastPressureDate ? [pressureReminder(vehicle.tireLastPressureDate)] : []),
    ];
    const staleTires = existing.filter((r) => (r.source === 'AUTO_ROTATION' || r.source === 'AUTO_PRESSURE') && !r.doneAt && !tireReminders.some((item) => item.sourceKey === r.sourceKey));
    if (staleTires.length) {
      await this.reminders.softRemove(staleTires);
      staleTires.forEach((r) => byKey.delete(r.sourceKey!));
    }
    desired.push(...tireReminders);

    const ipva = ipvaEstimate(debts ?? [], today, vehicle.fipeValueCents);
    if (ipva) desired.push(ipva);

    if (debts) {
      desired.push(...debtReminders(debts));

      for (const key of paidDebtKeys(debts)) {
        const reminder = byKey.get(key);
        if (reminder && !reminder.doneAt) await this.reminders.save(this.reminders.merge(reminder, { doneAt: new Date() }));
      }
    }

    for (const item of desired) {
      const current = byKey.get(item.sourceKey);
      if (!current) {
        await this.reminders.save(this.reminders.create({ vehicleId: vehicle.id, ...item }));
      } else if (!current.doneAt && (current.dueDate !== item.dueDate || current.dueOdometer !== item.dueOdometer || current.amountCents !== item.amountCents || current.title !== item.title)) {
        await this.reminders.save(this.reminders.merge(current, item));
      }
    }
  }

  private async lastOilChange(vehicle: Vehicle, today: string) {
    const maintenance = await this.expenses.find({
      where: { vehicleId: vehicle.id, category: { code: 'MAINTENANCE' } },
      order: { date: 'DESC', createdAt: 'DESC' },
      take: 50,
    });
    const last = maintenance.find((expense) => expense.description && OIL_CHANGE_PATTERN.test(expense.description));
    if (last) return { date: last.date, odometer: last.odometer ?? vehicle.baseOdometer };
    const since = vehicle.createdAt ? todayInBrazil(vehicle.createdAt) : today;
    return { date: since, odometer: vehicle.baseOdometer };
  }

  async upsertAuto(vehicleId: string, item: AutoReminder) {
    const current = await this.reminders.findOne({ where: { vehicleId, sourceKey: item.sourceKey } });
    if (!current) {
      await this.reminders.save(this.reminders.create({ vehicleId, ...item }));
    } else if (current.dueDate !== item.dueDate || current.title !== item.title) {
      await this.reminders.save(this.reminders.merge(current, { ...item, doneAt: null }));
    }
  }

  async removeAuto(vehicleId: string, sourceKey: string) {
    const current = await this.reminders.findOne({ where: { vehicleId, sourceKey } });
    if (current) await this.reminders.softRemove(current);
  }

  async syncDebtsForPlate(userId: string, plate: string, debts: PlateDebt[]) {
    const vehicle = await this.vehicles.findOne({ where: { ownerId: userId, plate, active: true } });
    if (vehicle) await this.sync(vehicle, debts);
  }
}
