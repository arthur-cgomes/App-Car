import { Body, Controller, Delete, Get, HttpCode, Module, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExpensesModule } from '../expenses/expenses.module';
import { FilesModule } from '../files/files.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { PayDocumentDto, SaveDocumentDto } from './document.dto';
import { DocumentsService } from './documents.service';
import { VehicleDocument } from './vehicle-document.entity';

@ApiTags('documents')
@Controller('vehicles/:vehicleId/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string) {
    return this.documents.list(user.id, vehicleId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Body() dto: SaveDocumentDto) {
    return this.documents.create(user.id, vehicleId, dto);
  }

  @Patch(':documentId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: SaveDocumentDto,
  ) {
    return this.documents.update(user.id, vehicleId, documentId, dto);
  }

  @Delete(':documentId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.documents.remove(user.id, vehicleId, documentId);
  }

  @Post(':documentId/pay')
  @HttpCode(200)
  pay(
    @CurrentUser() user: AuthUser,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: PayDocumentDto,
  ) {
    return this.documents.pay(user.id, vehicleId, documentId, dto);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([VehicleDocument]), VehiclesModule, FilesModule, ExpensesModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
