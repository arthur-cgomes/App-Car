import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { todayInBrazil } from '../../common/today';
import type { PlateDebt } from '../plate-lookup/plate-provider';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Reminder } from './reminder.entity';
import { AutoReminder, debtReminders, ipvaEstimate, paidDebtKeys, serviceReminder } from './reminder-rules';

@Injectable()
export class ReminderSyncService {
  constructor(
    @InjectRepository(Reminder) private readonly reminders: Repository<Reminder>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
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

    if (debts) {
      desired.push(...debtReminders(debts));
      const ipva = ipvaEstimate(debts, today);
      if (ipva) desired.push(ipva);

      for (const key of paidDebtKeys(debts)) {
        const reminder = byKey.get(key);
        if (reminder && !reminder.doneAt) await this.reminders.save(this.reminders.merge(reminder, { doneAt: new Date() }));
      }
    }

    for (const item of desired) {
      const current = byKey.get(item.sourceKey);
      if (!current) {
        await this.reminders.save(this.reminders.create({ vehicleId: vehicle.id, ...item }));
      } else if (!current.doneAt && (current.dueDate !== item.dueDate || current.amountCents !== item.amountCents || current.title !== item.title)) {
        await this.reminders.save(this.reminders.merge(current, item));
      }
    }
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
