import { Body, Controller, Delete, Get, HttpCode, Module, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FilesModule } from '../files/files.module';
import { RemindersModule } from '../reminders/reminders.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { SaveInsuranceDto } from './insurance.dto';
import { Insurance } from './insurance.entity';
import { InsurancesService } from './insurances.service';

@ApiTags('insurances')
@Controller('vehicles/:vehicleId/insurances')
export class InsurancesController {
  constructor(private readonly insurances: InsurancesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string) {
    return this.insurances.list(user.id, vehicleId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Body() dto: SaveInsuranceDto) {
    return this.insurances.create(user.id, vehicleId, dto);
  }

  @Patch(':insuranceId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('insuranceId', ParseUUIDPipe) insuranceId: string,
    @Body() dto: SaveInsuranceDto,
  ) {
    return this.insurances.update(user.id, vehicleId, insuranceId, dto);
  }

  @Delete(':insuranceId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('insuranceId', ParseUUIDPipe) insuranceId: string,
  ) {
    return this.insurances.remove(user.id, vehicleId, insuranceId);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Insurance]), VehiclesModule, FilesModule, RemindersModule],
  controllers: [InsurancesController],
  providers: [InsurancesService],
})
export class InsurancesModule {}
