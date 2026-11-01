import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateExpenseDto, ListExpensesQuery, UpdateExpenseDto } from './dto/expense.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('expenses')
@Controller('vehicles/:vehicleId/expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Query() query: ListExpensesQuery) {
    return this.expenses.list(user.id, vehicleId, query);
  }

  @Get('months')
  months(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string) {
    return this.expenses.months(user.id, vehicleId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Body() dto: CreateExpenseDto) {
    return this.expenses.create(user.id, vehicleId, dto);
  }

  @Get(':expenseId')
  get(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ) {
    return this.expenses.get(user.id, vehicleId, expenseId);
  }

  @Patch(':expenseId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenses.update(user.id, vehicleId, expenseId, dto);
  }

  @Delete(':expenseId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ) {
    return this.expenses.remove(user.id, vehicleId, expenseId);
  }
}
