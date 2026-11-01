import { BadRequestException, Controller, Get, Module, Param, ParseUUIDPipe, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Response } from 'express';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExpensesModule } from '../expenses/expenses.module';
import { FuelLog } from '../expenses/fuel-log.entity';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ReportsService } from './reports.service';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (value: string | undefined): value is string => {
  const time = value && DATE.test(value) ? Date.parse(`${value}T00:00:00Z`) : NaN;
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
};

@ApiTags('reports')
@Controller('vehicles/:vehicleId')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('fuel-stats')
  fuel(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string) {
    return this.reports.fuel(user.id, vehicleId);
  }

  @Get('reports')
  @ApiQuery({ name: 'format', enum: ['json', 'csv', 'pdf'], required: false })
  async report(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format = 'json',
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!isDate(from) || !isDate(to)) throw new BadRequestException('Informe o período.');
    if (!['json', 'csv', 'pdf'].includes(format)) throw new BadRequestException('Formato inválido.');
    const report = await this.reports.build(user.id, vehicleId, from, to);
    if (format === 'json') return report;

    const filename = `placar-${report.vehicle.plate}-${from}-a-${to}.${format}`;
    response.set({
      'Content-Type': format === 'csv' ? 'text/csv; charset=utf-8' : 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    });
    return new StreamableFile(format === 'csv' ? Buffer.from(this.reports.toCsv(report), 'utf8') : await this.reports.toPdf(report));
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([FuelLog]), VehiclesModule, ExpensesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
