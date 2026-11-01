import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ExpenseCategoryCode } from '@monitoring-car/shared';
import { Repository } from 'typeorm';
import { addDays, todayInBrazil } from '../../common/today';
import { Expense } from '../expenses/expense.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { CreateReminderDto, UpdateReminderDto } from './dto/reminder.dto';
import { Reminder, ReminderSource } from './reminder.entity';
import { addMonths } from './reminder-rules';

export interface ReminderView {
  id: string;
  category: ExpenseCategoryCode;
  title: string;
  source: ReminderSource;
  automatic: boolean;
  dueDate: string | null;
  dueOdometer: number | null;
  amountCents: number | null;
  repeatMonths: number | null;
  repeatKm: number | null;
  doneAt: Date | null;
}

const KM_WINDOW_DAYS = 120;
const MIN_SPAN_DAYS = 7;

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(Reminder) private readonly reminders: Repository<Reminder>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Expense) private readonly expenses: Repository<Expense>,
  ) {}

  async list(userId: string, vehicleId: string) {
    const vehicle = await this.ownedVehicle(userId, vehicleId);
    const kmPerDay = await this.kmPerDay(vehicleId);
    const items = await this.reminders.find({ where: { vehicleId } });
    const today = todayInBrazil();
    const daysUntil = (reminder: Reminder) => estimatedDays(reminder, today, vehicle.currentOdometer, kmPerDay);
    items.sort((a, b) =>
      !!a.doneAt !== !!b.doneAt
        ? Number(!!a.doneAt) - Number(!!b.doneAt)
        : a.doneAt
          ? b.doneAt!.getTime() - a.doneAt.getTime()
          : daysUntil(a) - daysUntil(b),
    );
    return { odometer: vehicle.currentOdometer, kmPerDay, items: items.map(toView) };
  }

  async pending(userId: string, vehicleId: string, take: number) {
    const { odometer, kmPerDay, items } = await this.list(userId, vehicleId);
    return { odometer, kmPerDay, items: items.filter((item) => !item.doneAt).slice(0, take) };
  }

  async create(userId: string, vehicleId: string, dto: CreateReminderDto) {
    await this.ownedVehicle(userId, vehicleId);
    if (!dto.dueDate && !dto.dueOdometer) throw new BadRequestException('Informe uma data ou uma quilometragem.');
    const reminder = await this.reminders.save(
      this.reminders.create({
        vehicleId,
        title: dto.title,
        categoryCode: dto.category,
        source: 'MANUAL',
        sourceKey: null,
        dueDate: dto.dueDate ?? null,
        dueOdometer: dto.dueOdometer ?? null,
        repeatMonths: dto.repeatMonths ?? null,
        repeatKm: dto.repeatKm ?? null,
      }),
    );
    return toView(reminder);
  }

  async update(userId: string, vehicleId: string, id: string, dto: UpdateReminderDto) {
    const reminder = await this.owned(userId, vehicleId, id);
    if (reminder.source !== 'MANUAL') throw new BadRequestException('Lembretes automáticos não podem ser editados.');
    const { category, ...rest } = dto;
    this.reminders.merge(reminder, { ...rest, ...(category && { categoryCode: category }) });
    if (!reminder.dueDate && !reminder.dueOdometer) throw new BadRequestException('Informe uma data ou uma quilometragem.');
    return toView(await this.reminders.save(reminder));
  }

  async remove(userId: string, vehicleId: string, id: string) {
    const reminder = await this.owned(userId, vehicleId, id);
    if (reminder.source !== 'MANUAL') {
      throw new BadRequestException('Lembretes automáticos não podem ser excluídos; marque como concluído.');
    }
    await this.reminders.softRemove(reminder);
  }

  async done(userId: string, vehicleId: string, id: string) {
    const reminder = await this.owned(userId, vehicleId, id);
    if (reminder.doneAt) return toView(reminder);
    reminder.doneAt = new Date();
    await this.reminders.save(reminder);

    if (reminder.source === 'MANUAL' && (reminder.repeatMonths || reminder.repeatKm)) {
      await this.reminders.save(
        this.reminders.create({
          vehicleId,
          title: reminder.title,
          categoryCode: reminder.categoryCode,
          source: 'MANUAL',
          sourceKey: null,
          dueDate: reminder.dueDate && reminder.repeatMonths ? addMonths(reminder.dueDate, reminder.repeatMonths) : null,
          dueOdometer: reminder.dueOdometer && reminder.repeatKm ? reminder.dueOdometer + reminder.repeatKm : null,
          repeatMonths: reminder.repeatMonths,
          repeatKm: reminder.repeatKm,
        }),
      );
    }
    return toView(reminder);
  }

  async undo(userId: string, vehicleId: string, id: string) {
    const reminder = await this.owned(userId, vehicleId, id);
    reminder.doneAt = null;
    return toView(await this.reminders.save(reminder));
  }

  async kmPerDay(vehicleId: string): Promise<number | null> {
    const row: { min_odo: number | null; max_odo: number | null; first: string | null; last: string | null } | undefined = await this.expenses
      .createQueryBuilder('expense')
      .select('min(expense.odometer)', 'min_odo')
      .addSelect('max(expense.odometer)', 'max_odo')
      .addSelect('min(expense.date)::text', 'first')
      .addSelect('max(expense.date)::text', 'last')
      .where('expense.vehicle_id = :vehicleId', { vehicleId })
      .andWhere('expense.odometer IS NOT NULL')
      .andWhere('expense.date >= :since', { since: addDays(todayInBrazil(), -KM_WINDOW_DAYS) })
      .getRawOne();
    if (!row?.first || !row.last) return null;
    const span = (Date.parse(row.last) - Date.parse(row.first)) / 86_400_000;
    if (span < MIN_SPAN_DAYS) return null;
    return Math.round(((Number(row.max_odo) - Number(row.min_odo)) / span) * 10) / 10;
  }

  private async ownedVehicle(userId: string, vehicleId: string) {
    const vehicle = await this.vehicles.findOne({ where: { id: vehicleId, ownerId: userId } });
    if (!vehicle) throw new NotFoundException('Registro não encontrado');
    return vehicle;
  }

  private async owned(userId: string, vehicleId: string, id: string) {
    const reminder = await this.reminders.findOne({ where: { id, vehicleId, vehicle: { ownerId: userId } } });
    if (!reminder) throw new NotFoundException('Lembrete não encontrado');
    return reminder;
  }
}

function estimatedDays(reminder: Reminder, today: string, odometer: number, kmPerDay: number | null) {
  const byDate = reminder.dueDate ? (Date.parse(reminder.dueDate) - Date.parse(today)) / 86_400_000 : Infinity;
  const byKm = reminder.dueOdometer ? (reminder.dueOdometer - odometer) / (kmPerDay || 30) : Infinity;
  return Math.min(byDate, byKm);
}

function toView(reminder: Reminder): ReminderView {
  return {
    id: reminder.id,
    category: reminder.categoryCode,
    title: reminder.title,
    source: reminder.source,
    automatic: reminder.source !== 'MANUAL',
    dueDate: reminder.dueDate,
    dueOdometer: reminder.dueOdometer,
    amountCents: reminder.amountCents,
    repeatMonths: reminder.repeatMonths,
    repeatKm: reminder.repeatKm,
    doneAt: reminder.doneAt,
  };
}

