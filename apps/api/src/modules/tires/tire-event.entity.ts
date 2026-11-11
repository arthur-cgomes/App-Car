import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Tire } from './tire.entity';

export type TireEventKind = 'INSTALLED' | 'ROTATION' | 'PRESSURE' | 'DAMAGE' | 'REMOVED';

const psi = { to: (value: number | null) => value, from: (value: string | null) => (value === null ? null : Number(value)) };

@Entity('tire_events')
@Index(['tireId', 'date'])
export class TireEvent extends BaseEntity {
  @Column({ type: 'uuid' })
  vehicleId: string;

  @Column({ type: 'uuid' })
  tireId: string;

  @ManyToOne(() => Tire, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tire_id' })
  tire?: Tire;

  @Column({ type: 'varchar', length: 12 })
  kind: TireEventKind;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'integer' })
  odometer: number;

  @Column({ type: 'varchar', length: 200 })
  description: string;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true, transformer: psi })
  pressurePsi: number | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  damageType: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  severity: string | null;

  @Column({ type: 'boolean', default: false })
  repaired: boolean;

  @Column({ type: 'integer', nullable: true })
  costCents: number | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  fileId: string | null;
}
