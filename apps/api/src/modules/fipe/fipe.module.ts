import { Controller, Get, Module, Param, ParseUUIDPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Env } from '../../config/env';
import { RemindersModule } from '../reminders/reminders.module';
import { Vehicle } from '../vehicles/vehicle.entity';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { FipeProvider } from './fipe-provider';
import { FipeService } from './fipe.service';
import { MockFipeProvider } from './mock-fipe.provider';
import { ParallelumFipeProvider } from './parallelum-fipe.provider';

@ApiTags('fipe')
@Controller('vehicles/:vehicleId/fipe')
export class FipeController {
  constructor(private readonly fipe: FipeService) {}

  @Get()
  get(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string) {
    return this.fipe.forVehicle(user.id, vehicleId);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle]), VehiclesModule, RemindersModule],
  controllers: [FipeController],
  providers: [
    FipeService,
    {
      provide: FipeProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        config.get('FIPE_PROVIDER', { infer: true }) === 'mock'
          ? new MockFipeProvider()
          : new ParallelumFipeProvider(config.get('FIPE_TOKEN', { infer: true }) || undefined),
    },
  ],
})
export class FipeModule {}
