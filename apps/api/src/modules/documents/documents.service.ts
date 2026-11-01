import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { todayInBrazil } from '../../common/today';
import { ExpensesService } from '../expenses/expenses.service';
import { FilesService } from '../files/files.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { PayDocumentDto, SaveDocumentDto } from './document.dto';
import { DOCUMENT_TYPE_NAMES, VehicleDocument } from './vehicle-document.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(VehicleDocument) private readonly documents: Repository<VehicleDocument>,
    private readonly vehicles: VehiclesService,
    private readonly files: FilesService,
    private readonly expenses: ExpensesService,
  ) {}

  async list(userId: string, vehicleId: string) {
    await this.vehicles.findOwned(userId, vehicleId);
    const items = await this.documents.find({ where: { vehicleId }, order: { year: 'DESC', createdAt: 'DESC' } });
    return items.sort((a, b) => Number(!!a.paidAt) - Number(!!b.paidAt) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  }

  async create(userId: string, vehicleId: string, dto: SaveDocumentDto) {
    await this.vehicles.findOwned(userId, vehicleId);
    if (dto.fileId) await this.files.assertOwned(userId, [dto.fileId]);
    return this.documents.save(this.documents.create({ vehicleId, ...normalized(dto) }));
  }

  async update(userId: string, vehicleId: string, id: string, dto: SaveDocumentDto) {
    const document = await this.owned(userId, vehicleId, id);
    if (dto.fileId) await this.files.assertOwned(userId, [dto.fileId]);
    return this.documents.save(this.documents.merge(document, normalized(dto)));
  }

  async remove(userId: string, vehicleId: string, id: string) {
    await this.documents.softRemove(await this.owned(userId, vehicleId, id));
  }

  async pay(userId: string, vehicleId: string, id: string, dto: PayDocumentDto) {
    const document = await this.owned(userId, vehicleId, id);
    if (document.paidAt) throw new BadRequestException('Este documento já está pago.');
    if (!document.amountCents) throw new BadRequestException('Informe o valor para marcar como pago.');
    const date = dto.date ?? todayInBrazil();
    const expense = await this.expenses.create(
      userId,
      vehicleId,
      {
        category: 'DOCUMENTS',
        amountCents: document.amountCents,
        date,
        description: [DOCUMENT_TYPE_NAMES[document.type], document.year].filter(Boolean).join(' '),
      },
      { source: 'DOCUMENT' },
    );
    document.paidAt = date;
    document.expenseId = expense.id;
    return this.documents.save(document);
  }

  private async owned(userId: string, vehicleId: string, id: string) {
    const document = await this.documents.findOne({ where: { id, vehicleId, vehicle: { ownerId: userId } } });
    if (!document) throw new NotFoundException('Documento não encontrado');
    return document;
  }
}

function normalized(dto: SaveDocumentDto) {
  return {
    type: dto.type,
    year: dto.year ?? null,
    amountCents: dto.amountCents ?? null,
    dueDate: dto.dueDate ?? null,
    fileId: dto.fileId ?? null,
    notes: dto.notes ?? null,
  };
}
