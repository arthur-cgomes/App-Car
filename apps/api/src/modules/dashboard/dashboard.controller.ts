import { BadRequestException, Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('summary')
@Controller('vehicles/:vehicleId/summary')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @ApiQuery({ name: 'month', example: '2026-10', description: 'Mês corrente no fuso do usuário' })
  summary(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Query('month') month: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? '')) throw new BadRequestException('Mês inválido.');
    return this.dashboard.summary(user.id, vehicleId, month);
  }
}
