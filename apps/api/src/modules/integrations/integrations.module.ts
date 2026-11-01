import { Body, Controller, Module, Post, Res } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Response } from 'express';
import { AuthUser } from '../../common/auth/auth-user';
import { ApiKeyAuth } from '../../common/decorators/api-key-auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Expense } from '../expenses/expense.entity';
import { ExpensesModule } from '../expenses/expenses.module';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { IntegrationFuelExpenseDto } from './fuel-expense.dto';
import { IntegrationsService } from './integrations.service';

@ApiTags('integrations')
@ApiHeader({ name: 'X-Api-Key', required: true, description: 'Chave criada em Perfil → Integrações' })
@ApiKeyAuth()
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Post('fuel-expenses')
  async fuel(@CurrentUser() user: AuthUser, @Body() dto: IntegrationFuelExpenseDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.integrations.createFuelExpense(user.id, dto);
    response.status(result.duplicate ? 200 : 201);
    return result;
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, User, Expense]), ExpensesModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
})
export class IntegrationsModule {}
