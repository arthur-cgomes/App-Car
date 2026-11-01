import { Body, Controller, Delete, Get, HttpCode, Module, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { SaveEmergencyContactDto } from './emergency-contact.dto';
import { EmergencyContact } from './emergency-contact.entity';
import { EmergencyContactsService } from './emergency-contacts.service';

@ApiTags('emergency-contacts')
@Controller('vehicles/:vehicleId/emergency-contacts')
export class EmergencyContactsController {
  constructor(private readonly contacts: EmergencyContactsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string) {
    return this.contacts.list(user.id, vehicleId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Body() dto: SaveEmergencyContactDto) {
    return this.contacts.create(user.id, vehicleId, dto);
  }

  @Patch(':contactId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: SaveEmergencyContactDto,
  ) {
    return this.contacts.update(user.id, vehicleId, contactId, dto);
  }

  @Delete(':contactId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.contacts.remove(user.id, vehicleId, contactId);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([EmergencyContact]), VehiclesModule],
  controllers: [EmergencyContactsController],
  providers: [EmergencyContactsService],
})
export class EmergencyContactsModule {}
