import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../users/user.entity';

@Entity('vehicles')
@Index('uq_vehicles_plate_active', ['plate'], {
  unique: true,
  where: '"active" = true AND "deleted_at" IS NULL',
})
@Index(['ownerId'])
export class Vehicle extends BaseEntity {
  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner?: User;

  @Column({ type: 'varchar', length: 7 })
  plate: string;

  @Column({ type: 'varchar', length: 11, nullable: true })
  renavam: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  model: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  modelVersion: string | null;

  @Column({ type: 'smallint', nullable: true })
  yearFab: number | null;

  @Column({ type: 'smallint', nullable: true })
  yearModel: number | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  fuelType: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  municipality: string | null;

  @Column({ type: 'char', length: 2, nullable: true })
  uf: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  restrictions: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  fipeCode: string | null;

  @Column({ type: 'integer', nullable: true })
  fipeValueCents: number | null;

  @Column({ type: 'varchar', length: 7, nullable: true })
  fipeRefMonth: string | null;

  @Column({ type: 'boolean', default: false })
  fipeManual: boolean;

  @Column({ type: 'integer', default: 0 })
  currentOdometer: number;

  @Column({ type: 'date', nullable: true })
  purchaseDate: string | null;

  @Column({ type: 'integer', nullable: true })
  purchaseOdometer: number | null;

  @Column({ type: 'integer', default: 0 })
  baseOdometer: number;

  @Column({ type: 'integer', default: 10000 })
  serviceIntervalKm: number;

  @Column({ type: 'integer', default: 10000 })
  oilChangeIntervalKm: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
