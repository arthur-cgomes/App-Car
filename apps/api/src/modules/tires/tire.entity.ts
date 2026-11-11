import type { TireSlot } from '@monitoring-car/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

const psi = { to: (value: number | null) => value, from: (value: string | null) => (value === null ? null : Number(value)) };

@Entity('tires')
@Index('uq_tires_vehicle_id_position', ['vehicleId', 'position'], { unique: true, where: '"position" IS NOT NULL AND "deleted_at" IS NULL' })
export class Tire extends BaseEntity {
  @Column({ type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;

  @Column({ type: 'smallint' })
  number: number;

  @Column({ type: 'varchar', length: 3, nullable: true })
  position: TireSlot | null;

  @Column({ type: 'varchar', length: 60 })
  brand: string;

  @Column({ type: 'varchar', length: 60 })
  model: string;

  @Column({ type: 'varchar', length: 30 })
  size: string;

  @Column({ type: 'integer', nullable: true })
  priceCents: number | null;

  @Column({ type: 'integer' })
  installedOdometer: number;

  @Column({ type: 'date' })
  installedDate: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  store: string | null;

  @Column({ type: 'integer' })
  lifeKm: number;

  @Column({ type: 'integer', default: 0 })
  frontKm: number;

  @Column({ type: 'integer', default: 0 })
  rearKm: number;

  @Column({ type: 'integer' })
  baseOdometer: number;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true, transformer: psi })
  pressurePsi: number | null;

  @Column({ type: 'smallint', nullable: true })
  manufactureYear: number | null;

  @Column({ type: 'uuid', nullable: true })
  treadFileId: string | null;

  @Column({ type: 'uuid', nullable: true })
  sideFileId: string | null;
}
