import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateReminderDto, UpdateReminderDto } from './dto/reminder.dto';
import { RemindersService } from './reminders.service';

@ApiTags('reminders')
@Controller('vehicles/:vehicleId/reminders')
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string) {
    return this.reminders.list(user.id, vehicleId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Body() dto: CreateReminderDto) {
    return this.reminders.create(user.id, vehicleId, dto);
  }

  @Patch(':reminderId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('reminderId', ParseUUIDPipe) reminderId: string,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.reminders.update(user.id, vehicleId, reminderId, dto);
  }

  @Delete(':reminderId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('reminderId', ParseUUIDPipe) reminderId: string,
  ) {
    return this.reminders.remove(user.id, vehicleId, reminderId);
  }

  @Post(':reminderId/done')
  @HttpCode(200)
  done(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('reminderId', ParseUUIDPipe) reminderId: string,
  ) {
    return this.reminders.done(user.id, vehicleId, reminderId);
  }

  @Post(':reminderId/undo')
  @HttpCode(200)
  undo(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('reminderId', ParseUUIDPipe) reminderId: string,
  ) {
    return this.reminders.undo(user.id, vehicleId, reminderId);
  }
}
