import type { ExpenseCategoryCode } from '@monitoring-car/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

export type ReminderSource = 'MANUAL' | 'AUTO_DEBT' | 'AUTO_IPVA' | 'AUTO_SERVICE' | 'AUTO_OIL' | 'AUTO_INSURANCE';

@Entity('reminders')
@Index('uq_reminders_vehicle_id_source_key', ['vehicleId', 'sourceKey'], {
  unique: true,
  where: '"source_key" IS NOT NULL AND "deleted_at" IS NULL',
})
@Index(['vehicleId', 'doneAt'])
export class Reminder extends BaseEntity {
  @Column({ type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;

  @Column({ type: 'varchar', length: 20 })
  categoryCode: ExpenseCategoryCode;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 20 })
  source: ReminderSource;

  @Column({ type: 'varchar', length: 120, nullable: true })
  sourceKey: string | null;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'integer', nullable: true })
  dueOdometer: number | null;

  @Column({ type: 'integer', nullable: true })
  amountCents: number | null;

  @Column({ type: 'smallint', nullable: true })
  repeatMonths: number | null;

  @Column({ type: 'integer', nullable: true })
  repeatKm: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  doneAt: Date | null;
}
