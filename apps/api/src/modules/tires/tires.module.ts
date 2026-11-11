import { Body, Controller, Get, Module, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExpensesModule } from '../expenses/expenses.module';
import { FilesModule } from '../files/files.module';
import { RemindersModule } from '../reminders/reminders.module';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { TireEvent } from './tire-event.entity';
import { TireRotation } from './tire-rotation.entity';
import { OccurrenceDto, PressureDto, ReplaceTireDto, RotationDto, SetupTiresDto, TirePhotosDto, TireSettingsDto } from './tire.dto';
import { Tire } from './tire.entity';
import { TiresService } from './tires.service';

@ApiTags('tires')
@Controller('vehicles/:vehicleId/tires')
export class TiresController {
  constructor(private readonly tires: TiresService) {}

  @Get()
  overview(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string) {
    return this.tires.overview(user.id, vehicleId);
  }

  @Post()
  setup(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Body() dto: SetupTiresDto) {
    return this.tires.setup(user.id, vehicleId, dto);
  }

  @Patch('settings')
  settings(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Body() dto: TireSettingsDto) {
    return this.tires.updateSettings(user.id, vehicleId, dto);
  }

  @Post('pressure')
  calibrate(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Body() dto: PressureDto) {
    return this.tires.calibrate(user.id, vehicleId, dto);
  }

  @Post('rotations')
  rotate(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Body() dto: RotationDto) {
    return this.tires.rotate(user.id, vehicleId, dto);
  }

  @Post('occurrences')
  occurrence(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Body() dto: OccurrenceDto) {
    return this.tires.addOccurrence(user.id, vehicleId, dto);
  }

  @Post('occurrences/:eventId/repaired')
  repaired(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.tires.markRepaired(user.id, vehicleId, eventId);
  }

  @Post('replacements')
  replace(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Body() dto: ReplaceTireDto) {
    return this.tires.replace(user.id, vehicleId, dto);
  }

  @Patch(':tireId/photos')
  photos(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('tireId', ParseUUIDPipe) tireId: string,
    @Body() dto: TirePhotosDto,
  ) {
    return this.tires.updatePhotos(user.id, vehicleId, tireId, dto);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Tire, TireEvent, TireRotation, Vehicle]), VehiclesModule, ExpensesModule, FilesModule, RemindersModule],
  controllers: [TiresController],
  providers: [TiresService],
})
export class TiresModule {}
