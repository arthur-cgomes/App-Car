import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../expenses/expense.entity';
import { ExpensesService } from '../expenses/expenses.service';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { IntegrationFuelExpenseDto } from './fuel-expense.dto';

const brazilDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date);

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Expense) private readonly expenseRows: Repository<Expense>,
    private readonly expenses: ExpensesService,
  ) {}

  async createFuelExpense(userId: string, dto: IntegrationFuelExpenseDto) {
    const vehicle = await this.vehicleFor(userId, dto.plate);
    const occurredAt = new Date(dto.occurredAt);
    if (occurredAt.getTime() > Date.now() + 24 * 3600_000) throw new BadRequestException('A data do abastecimento está no futuro.');

    if (dto.externalId) {
      const existing = await this.expenseRows.findOne({ where: { vehicleId: vehicle.id, externalId: dto.externalId } });
      if (existing) return { duplicate: true, expense: await this.expenses.get(userId, vehicle.id, existing.id) };
    }

    const expense = await this.expenses.create(
      userId,
      vehicle.id,
      {
        category: 'FUEL',
        amountCents: Math.round(dto.amount * 100),
        date: brazilDate(occurredAt),
        description: dto.establishment,
        establishment: dto.establishment,
        odometer: dto.odometer ?? null,
        fuel: dto.liters ? { liters: dto.liters, fullTank: dto.fullTank ?? false } : null,
      },
      { source: 'API', occurredAt, externalId: dto.externalId ?? null },
    );
    return { duplicate: false, expense };
  }

  private async vehicleFor(userId: string, plate?: string) {
    if (plate) {
      const vehicle = await this.vehicles.findOne({ where: { ownerId: userId, plate, active: true } });
      if (!vehicle) throw new UnprocessableEntityException('Nenhum veículo com esta placa na conta.');
      return vehicle;
    }
    const user = await this.users.findOneByOrFail({ id: userId });
    const vehicle =
      (user.activeVehicleId && (await this.vehicles.findOne({ where: { id: user.activeVehicleId, ownerId: userId } }))) ||
      (await this.vehicles.findOne({ where: { ownerId: userId }, order: { createdAt: 'ASC' } }));
    if (!vehicle) throw new UnprocessableEntityException('Cadastre um veículo no VW Polo antes de enviar gastos.');
    return vehicle;
  }
}
