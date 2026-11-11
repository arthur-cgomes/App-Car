import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Entity('tire_rotations')
@Index(['vehicleId', 'date'])
export class TireRotation extends BaseEntity {
  @Column({ type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'integer' })
  odometer: number;

  @Column({ type: 'varchar', length: 10 })
  kind: string;
}
