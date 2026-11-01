import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RemindersModule } from '../reminders/reminders.module';
import { PlateLookupHistory } from './entities/plate-lookup-history.entity';
import { PlateLookup } from './entities/plate-lookup.entity';
import { PlateLookupController } from './plate-lookup.controller';
import { PlateLookupService } from './plate-lookup.service';
import { PlateProvider } from './plate-provider';
import { MockPlateProvider } from './providers/mock-plate.provider';

@Module({
  imports: [TypeOrmModule.forFeature([PlateLookup, PlateLookupHistory]), RemindersModule],
  controllers: [PlateLookupController],
  providers: [PlateLookupService, { provide: PlateProvider, useClass: MockPlateProvider }],
  exports: [PlateLookupService],
})
export class PlateLookupModule {}
