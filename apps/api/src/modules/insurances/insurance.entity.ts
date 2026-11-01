import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { StoredFile } from '../files/file.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

@Entity('insurances')
@Index(['vehicleId', 'endDate'])
export class Insurance extends BaseEntity {
  @Column({ type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;

  @Column({ type: 'varchar', length: 80 })
  insurer: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  policyNumber: string | null;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'integer', nullable: true })
  premiumCents: number | null;

  @Column({ type: 'smallint', nullable: true })
  installments: number | null;

  @Column({ type: 'integer', nullable: true })
  deductibleCents: number | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  brokerContact: string | null;

  @Column({ type: 'uuid', nullable: true })
  fileId: string | null;

  @ManyToOne(() => StoredFile, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'file_id' })
  file?: StoredFile;
}
