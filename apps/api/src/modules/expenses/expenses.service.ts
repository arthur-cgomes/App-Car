import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  CATEGORIES_REQUIRING_PART_SYSTEM,
  CATEGORIES_WITH_PART_SYSTEM,
  EXPENSE_CATEGORY_BY_CODE,
  type ExpenseCategoryCode,
  type PartSystemCode,
} from '@monitoring-car/shared';
import { Between, DataSource, EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { FilesService } from '../files/files.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateExpenseDto, FuelDto, ListExpensesQuery, UpdateExpenseDto } from './dto/expense.dto';
import { ExpenseAttachment } from './expense-attachment.entity';
import { ExpenseCategory } from './expense-category.entity';
import { Expense, ExpenseSource } from './expense.entity';
import { FuelLog } from './fuel-log.entity';

const LIST_LIMIT = 500;
const RELATIONS = { category: true, attachments: true, fuel: true } as const;

export interface ExpenseView {
  id: string;
  vehicleId: string;
  category: ExpenseCategoryCode;
  partSystem: PartSystemCode | null;
  description: string;
  amountCents: number;
  date: string;
  odometer: number | null;
  occurredAt: Date | null;
  establishment: string | null;
  partsCents: number | null;
  laborCents: number | null;
  source: ExpenseSource;
  attachments: { id: string }[];
  fuel: { liters: number; fullTank: boolean } | null;
  createdAt: Date;
}

export interface ExpenseOrigin {
  source?: ExpenseSource;
  occurredAt?: Date | null;
  externalId?: string | null;
}

interface Normalized {
  category: ExpenseCategoryCode;
  partSystem: PartSystemCode | null;
  description: string;
  fuel: FuelDto | null;
}

@Injectable()
export class ExpensesService extends BaseCrudService<Expense> {
  private categoryIds: Map<string, string> | null = null;

  constructor(
    @InjectRepository(Expense) repository: Repository<Expense>,
    @InjectRepository(ExpenseCategory) private readonly categories: Repository<ExpenseCategory>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly vehicles: VehiclesService,
    private readonly files: FilesService,
  ) {
    super(repository);
  }

  protected ownerScope(userId: string): FindOptionsWhere<Expense> {
    return { vehicle: { ownerId: userId } };
  }

  async list(userId: string, vehicleId: string, query: ListExpensesQuery, take = LIST_LIMIT): Promise<ExpenseView[]> {
    await this.vehicles.findOwned(userId, vehicleId);
    const range = dateRange(query);
    const expenses = await this.repository.find({
      where: {
        vehicleId,
        ...(range && { date: Between(range.from, range.to) }),
        ...(query.category && { category: { code: query.category } }),
        ...(query.partSystem && { partSystem: query.partSystem }),
      },
      relations: RELATIONS,
      order: { date: 'DESC', createdAt: 'DESC', attachments: { position: 'ASC' } },
      take,
    });
    return expenses.map(toView);
  }

  async months(userId: string, vehicleId: string) {
    await this.vehicles.findOwned(userId, vehicleId);
    const rows: { month: string; count: string; total: string }[] = await this.repository
      .createQueryBuilder('expense')
      .select(`to_char(expense.date, 'YYYY-MM')`, 'month')
      .addSelect('count(*)', 'count')
      .addSelect('sum(expense.amount_cents)', 'total')
      .where('expense.vehicle_id = :vehicleId', { vehicleId })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany();
    return rows.map((row) => ({ month: row.month, count: Number(row.count), totalCents: Number(row.total) }));
  }

  async get(userId: string, vehicleId: string, id: string): Promise<ExpenseView> {
    return toView(await this.load(userId, vehicleId, id));
  }

  async create(userId: string, vehicleId: string, dto: CreateExpenseDto, origin: ExpenseOrigin = {}): Promise<ExpenseView> {
    await this.vehicles.findOwned(userId, vehicleId);
    const values = normalize(dto.category, dto.partSystem ?? null, dto.description ?? null, dto.fuel ?? null);
    await this.files.assertOwned(userId, dto.attachmentIds ?? []);
    const categoryId = await this.categoryId(values.category);

    const id = await this.dataSource.transaction(async (manager) => {
      const expense = await manager.getRepository(Expense).save(
        manager.getRepository(Expense).create({
          vehicleId,
          categoryId,
          partSystem: values.partSystem,
          description: values.description,
          amountCents: dto.amountCents,
          date: dto.date,
          odometer: dto.odometer ?? null,
          establishment: dto.establishment ?? null,
          ...breakdown(values.category, dto.amountCents, dto.partsCents, dto.laborCents),
          occurredAt: origin.occurredAt ?? null,
          externalId: origin.externalId ?? null,
          source: origin.source ?? 'MANUAL',
        }),
      );
      await this.replaceAttachments(manager, expense.id, dto.attachmentIds ?? []);
      await this.saveFuel(manager, expense.id, values.fuel);
      return expense.id;
    });
    await this.vehicles.refreshOdometer(vehicleId);
    return this.get(userId, vehicleId, id);
  }

  async update(userId: string, vehicleId: string, id: string, dto: UpdateExpenseDto): Promise<ExpenseView> {
    const expense = await this.load(userId, vehicleId, id);
    const current = toView(expense);
    const values = normalize(
      dto.category ?? current.category,
      dto.partSystem !== undefined ? dto.partSystem : current.partSystem,
      dto.description !== undefined ? dto.description : current.description,
      dto.fuel !== undefined ? dto.fuel : current.fuel,
    );
    if (dto.attachmentIds) await this.files.assertOwned(userId, dto.attachmentIds);
    const categoryId = await this.categoryId(values.category);

    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Expense);
      const entity = await repository.findOneByOrFail({ id });
      repository.merge(entity, {
        categoryId,
        partSystem: values.partSystem,
        description: values.description,
        ...(dto.amountCents !== undefined && { amountCents: dto.amountCents }),
        ...(dto.date !== undefined && { date: dto.date }),
        ...(dto.odometer !== undefined && { odometer: dto.odometer }),
        ...(dto.establishment !== undefined && { establishment: dto.establishment }),
        ...breakdown(
          values.category,
          dto.amountCents ?? entity.amountCents,
          dto.partsCents !== undefined ? dto.partsCents : entity.partsCents,
          dto.laborCents !== undefined ? dto.laborCents : entity.laborCents,
        ),
      });
      await repository.save(entity);
      if (dto.attachmentIds) await this.replaceAttachments(manager, id, dto.attachmentIds);
      await this.saveFuel(manager, id, values.fuel);
    });
    await this.vehicles.refreshOdometer(vehicleId);
    return this.get(userId, vehicleId, id);
  }

  async remove(userId: string, vehicleId: string, id: string) {
    await this.load(userId, vehicleId, id);
    await this.removeOwned(userId, id);
    await this.vehicles.refreshOdometer(vehicleId);
  }

  private async load(userId: string, vehicleId: string, id: string) {
    const expense = await this.repository.findOne({
      where: { id, vehicleId, vehicle: { ownerId: userId } },
      relations: RELATIONS,
      order: { attachments: { position: 'ASC' } },
    });
    if (!expense) throw new NotFoundException('Gasto não encontrado');
    return expense;
  }

  private async replaceAttachments(manager: EntityManager, expenseId: string, fileIds: string[]) {
    const repository = manager.getRepository(ExpenseAttachment);
    const existing = await repository.find({ where: { expenseId } });
    const removed = existing.filter((a) => !fileIds.includes(a.fileId));
    if (removed.length) await repository.softRemove(removed);
    for (const [position, fileId] of fileIds.entries()) {
      const found = existing.find((a) => a.fileId === fileId);
      if (!found) await repository.save(repository.create({ expenseId, fileId, position }));
      else if (found.position !== position) await repository.save(repository.merge(found, { position }));
    }
  }

  private async saveFuel(manager: EntityManager, expenseId: string, fuel: FuelDto | null) {
    const repository = manager.getRepository(FuelLog);
    const existing = await repository.findOne({ where: { expenseId } });
    if (!fuel) {
      if (existing) await repository.softRemove(existing);
      return;
    }
    const data = { liters: fuel.liters, fullTank: fuel.fullTank ?? false };
    if (existing && (existing.liters !== data.liters || existing.fullTank !== data.fullTank)) {
      await repository.save(repository.merge(existing, data));
    } else if (!existing) {
      await repository.save(repository.create({ expenseId, ...data }));
    }
  }

  private async categoryId(code: ExpenseCategoryCode) {
    this.categoryIds ??= new Map((await this.categories.find()).map((c) => [c.code, c.id]));
    const id = this.categoryIds.get(code);
    if (!id) throw new BadRequestException('Categoria inválida.');
    return id;
  }
}

function normalize(
  category: ExpenseCategoryCode,
  partSystem: PartSystemCode | null,
  description: string | null,
  fuel: FuelDto | null,
): Normalized {
  const part = CATEGORIES_WITH_PART_SYSTEM.includes(category) ? partSystem : null;
  if (CATEGORIES_REQUIRING_PART_SYSTEM.includes(category) && !part) {
    throw new BadRequestException('Escolha a classificação da peça.');
  }
  return {
    category,
    partSystem: part,
    description: description?.trim() || EXPENSE_CATEGORY_BY_CODE[category].name,
    fuel: category === 'FUEL' ? fuel : null,
  };
}

function breakdown(category: ExpenseCategoryCode, amountCents: number, parts: number | null | undefined, labor: number | null | undefined) {
  if (category !== 'MAINTENANCE' || (parts == null && labor == null)) return { partsCents: null, laborCents: null };
  const partsCents = parts ?? 0;
  const laborCents = labor ?? 0;
  if (partsCents + laborCents !== amountCents) {
    throw new BadRequestException('O valor total deve ser a soma de peças e mão de obra.');
  }
  return { partsCents, laborCents };
}

function dateRange(query: ListExpensesQuery) {
  if (query.month) {
    const [year, month] = query.month.split('-').map(Number);
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return { from: `${query.month}-01`, to: `${query.month}-${String(last).padStart(2, '0')}` };
  }
  if (query.from || query.to) return { from: query.from ?? '0001-01-01', to: query.to ?? '9999-12-31' };
  return null;
}

function toView(expense: Expense): ExpenseView {
  return {
    id: expense.id,
    vehicleId: expense.vehicleId,
    category: expense.category!.code as ExpenseCategoryCode,
    partSystem: expense.partSystem,
    description: expense.description ?? EXPENSE_CATEGORY_BY_CODE[expense.category!.code as ExpenseCategoryCode].name,
    amountCents: expense.amountCents,
    date: expense.date,
    odometer: expense.odometer,
    occurredAt: expense.occurredAt,
    establishment: expense.establishment,
    partsCents: expense.partsCents,
    laborCents: expense.laborCents,
    source: expense.source,
    attachments: (expense.attachments ?? []).map((a) => ({ id: a.fileId })),
    fuel: expense.fuel ? { liters: expense.fuel.liters, fullTank: expense.fuel.fullTank } : null,
    createdAt: expense.createdAt,
  };
}

