import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RemindersModule } from '../reminders/reminders.module';
import { PlateLookupHistory } from './entities/plate-lookup-history.entity';
import { PlateLookup } from './entities/plate-lookup.entity';
import { PlateLookupController } from './plate-lookup.controller';
import { PlateLookupService } from './plate-lookup.service';
import { PlateProvider } from './plate-provider';
import { MockPlateProvider } from './providers/mock-plate.provider';
import { NonePlateProvider } from './providers/none-plate.provider';

@Module({
  imports: [TypeOrmModule.forFeature([PlateLookup, PlateLookupHistory]), RemindersModule],
  controllers: [PlateLookupController],
  providers: [
    PlateLookupService,
    {
      provide: PlateProvider,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        config.get('PLATE_PROVIDER', { infer: true }) === 'none' ? new NonePlateProvider() : new MockPlateProvider(),
    },
  ],
  exports: [PlateLookupService],
})
export class PlateLookupModule {}
