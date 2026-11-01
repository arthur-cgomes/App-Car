import type { EmergencyContactKind } from '@monitoring-car/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Entity('emergency_contacts')
@Index(['vehicleId'])
export class EmergencyContact extends BaseEntity {
  @Column({ type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;

  @Column({ type: 'varchar', length: 20 })
  kind: EmergencyContactKind;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 30 })
  phone: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  notes: string | null;
}
