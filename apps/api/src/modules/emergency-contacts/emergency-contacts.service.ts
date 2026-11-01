import { EMERGENCY_CONTACT_KINDS } from '@monitoring-car/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehiclesService } from '../vehicles/vehicles.service';
import { SaveEmergencyContactDto } from './emergency-contact.dto';
import { EmergencyContact } from './emergency-contact.entity';

const KIND_ORDER: string[] = EMERGENCY_CONTACT_KINDS.map((kind) => kind.code);

@Injectable()
export class EmergencyContactsService {
  constructor(
    @InjectRepository(EmergencyContact) private readonly contacts: Repository<EmergencyContact>,
    private readonly vehicles: VehiclesService,
  ) {}

  async list(userId: string, vehicleId: string) {
    await this.vehicles.findOwned(userId, vehicleId);
    const contacts = await this.contacts.find({ where: { vehicleId }, order: { name: 'ASC' } });
    return contacts.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  }

  async create(userId: string, vehicleId: string, dto: SaveEmergencyContactDto) {
    await this.vehicles.findOwned(userId, vehicleId);
    return this.contacts.save(this.contacts.create({ vehicleId, ...dto, notes: dto.notes ?? null }));
  }

  async update(userId: string, vehicleId: string, id: string, dto: SaveEmergencyContactDto) {
    const contact = await this.owned(userId, vehicleId, id);
    return this.contacts.save(this.contacts.merge(contact, { ...dto, notes: dto.notes ?? null }));
  }

  async remove(userId: string, vehicleId: string, id: string) {
    await this.contacts.softRemove(await this.owned(userId, vehicleId, id));
  }

  private async owned(userId: string, vehicleId: string, id: string) {
    await this.vehicles.findOwned(userId, vehicleId);
    const contact = await this.contacts.findOne({ where: { id, vehicleId } });
    if (!contact) throw new NotFoundException('Contato não encontrado');
    return contact;
  }
}
