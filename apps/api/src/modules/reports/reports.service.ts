import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EXPENSE_CATEGORY_BY_CODE, PART_SYSTEM_BY_CODE, formatPlate } from '@monitoring-car/shared';
import PDFDocument from 'pdfkit';
import { Repository } from 'typeorm';
import { ExpensesService, ExpenseView } from '../expenses/expenses.service';
import { FuelLog } from '../expenses/fuel-log.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehiclesService } from '../vehicles/vehicles.service';
import { fuelStats } from './fuel-stats';

const MAX_RANGE_DAYS = 3 * 366;
const REPORT_LIMIT = 5000;

const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const brTime = (date: Date) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(date);
const money = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

export interface Report {
  vehicle: { plate: string; name: string };
  from: string;
  to: string;
  totalCents: number;
  count: number;
  byCategory: { code: string; name: string; cents: number; count: number }[];
  byPartSystem: { code: string; name: string; cents: number }[];
  byMonth: { month: string; cents: number }[];
  costs: { partsCents: number; laborCents: number; maintenanceUnsplitCents: number };
  expenses: ExpenseView[];
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(FuelLog) private readonly fuelLogs: Repository<FuelLog>,
    private readonly vehicles: VehiclesService,
    private readonly expenses: ExpensesService,
  ) {}

  async fuel(userId: string, vehicleId: string) {
    await this.vehicles.findOwned(userId, vehicleId);
    const logs = await this.fuelLogs.find({ where: { expense: { vehicleId } }, relations: { expense: true } });
    return fuelStats(
      logs
        .filter((log) => log.expense)
        .map((log) => ({
          expenseId: log.expenseId,
          date: log.expense!.date,
          odometer: log.expense!.odometer,
          liters: log.liters,
          fullTank: log.fullTank,
          amountCents: log.expense!.amountCents,
        })),
    );
  }

  async build(userId: string, vehicleId: string, from: string, to: string): Promise<Report> {
    if (from > to) throw new BadRequestException('O início do período deve ser antes do fim.');
    if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > MAX_RANGE_DAYS) {
      throw new BadRequestException('Escolha um período de até 3 anos.');
    }
    const vehicle = await this.vehicles.findOwned(userId, vehicleId);
    const expenses = await this.expenses.list(userId, vehicleId, { from, to }, REPORT_LIMIT);

    const byCategory = new Map<string, { cents: number; count: number }>();
    const byPart = new Map<string, number>();
    const byMonth = new Map<string, number>();
    const costs = { partsCents: 0, laborCents: 0, maintenanceUnsplitCents: 0 };
    for (const expense of expenses) {
      if (expense.category === 'PARTS') costs.partsCents += expense.amountCents;
      if (expense.category === 'MAINTENANCE') {
        if (expense.partsCents === null) costs.maintenanceUnsplitCents += expense.amountCents;
        else {
          costs.partsCents += expense.partsCents;
          costs.laborCents += expense.laborCents ?? 0;
        }
      }
      const category = byCategory.get(expense.category) ?? { cents: 0, count: 0 };
      byCategory.set(expense.category, { cents: category.cents + expense.amountCents, count: category.count + 1 });
      if (expense.partSystem) byPart.set(expense.partSystem, (byPart.get(expense.partSystem) ?? 0) + expense.amountCents);
      const month = expense.date.slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + expense.amountCents);
    }

    return {
      vehicle: { plate: vehicle.plate, name: vehicleName(vehicle) },
      from,
      to,
      totalCents: expenses.reduce((sum, e) => sum + e.amountCents, 0),
      count: expenses.length,
      byCategory: [...byCategory]
        .map(([code, v]) => ({ code, name: EXPENSE_CATEGORY_BY_CODE[code as keyof typeof EXPENSE_CATEGORY_BY_CODE].name, ...v }))
        .sort((a, b) => b.cents - a.cents),
      byPartSystem: [...byPart]
        .map(([code, cents]) => ({ code, name: PART_SYSTEM_BY_CODE[code as keyof typeof PART_SYSTEM_BY_CODE].name, cents }))
        .sort((a, b) => b.cents - a.cents),
      byMonth: [...byMonth].map(([month, cents]) => ({ month, cents })).sort((a, b) => a.month.localeCompare(b.month)),
      costs,
      expenses,
    };
  }

  toCsv(report: Report) {
    const escape = (value: string) => {
      const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
      return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const lines = [
      ['Data', 'Hora', 'Categoria', 'Peça', 'Local', 'Descrição', 'Odômetro (km)', 'Litros', 'Peças (R$)', 'Mão de obra (R$)', 'Valor (R$)'].join(';'),
      ...report.expenses.map((e) =>
        [
          brDate(e.date),
          e.occurredAt ? brTime(e.occurredAt) : '',
          EXPENSE_CATEGORY_BY_CODE[e.category].name,
          e.partSystem ? PART_SYSTEM_BY_CODE[e.partSystem].name : '',
          e.establishment ?? '',
          e.description,
          e.odometer ?? '',
          e.fuel ? String(e.fuel.liters).replace('.', ',') : '',
          e.partsCents === null ? '' : money(e.partsCents),
          e.laborCents === null ? '' : money(e.laborCents),
          money(e.amountCents),
        ]
          .map((value) => escape(String(value)))
          .join(';'),
      ),
    ];
    return `\uFEFF${lines.join('\r\n')}\r\n`;
  }

  toPdf(report: Report): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: 'Relatório de gastos do VW Polo' } });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const accent = '#001e50';
      const muted = '#5d5d60';
      const row = (left: string, right: string, options: { bold?: boolean } = {}) => {
        const y = doc.y;
        doc.font(options.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor('#1d1f20');
        doc.text(left, 48, y, { width: 360 });
        doc.text(right, 408, y, { width: 139, align: 'right' });
        doc.moveDown(0.3);
      };
      const heading = (text: string) => {
        doc.moveDown(0.8).font('Helvetica-Bold').fontSize(12).fillColor(accent).text(text, 48);
        doc.moveDown(0.3);
      };

      doc.font('Helvetica-Bold').fontSize(20).fillColor(accent).text('Relatório de gastos');
      doc.font('Helvetica').fontSize(11).fillColor(muted).text(`${report.vehicle.name} · ${formatPlate(report.vehicle.plate)}`);
      doc.text(`${brDate(report.from)} a ${brDate(report.to)} · ${report.count} lançamentos`);
      doc.moveDown(0.6).font('Helvetica-Bold').fontSize(16).fillColor('#1d1f20').text(`Total: ${brl(report.totalCents)}`);

      heading('Por categoria');
      for (const item of report.byCategory) row(`${item.name} (${item.count})`, brl(item.cents));
      if (report.byPartSystem.length) {
        heading('Peças e manutenção por sistema');
        for (const item of report.byPartSystem) row(item.name, brl(item.cents));
      }
      heading('Por mês');
      for (const item of report.byMonth) row(`${item.month.slice(5)}/${item.month.slice(0, 4)}`, brl(item.cents));

      heading('Lançamentos');
      for (const e of report.expenses) {
        if (doc.y > 760) doc.addPage();
        row(`${brDate(e.date)} · ${EXPENSE_CATEGORY_BY_CODE[e.category].name} · ${e.description}`, brl(e.amountCents));
      }

      doc.moveDown(1).font('Helvetica').fontSize(8).fillColor(muted).text('Gerado pelo VW Polo.', 48);
      doc.end();
    });
  }
}

function vehicleName(vehicle: Vehicle) {
  return [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Veículo';
}
