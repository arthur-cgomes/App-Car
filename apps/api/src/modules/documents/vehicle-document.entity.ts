import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { StoredFile } from '../files/file.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

export type DocumentType = 'IPVA' | 'LICENSING' | 'CRLV' | 'OTHER';

export const DOCUMENT_TYPE_NAMES: Record<DocumentType, string> = {
  IPVA: 'IPVA',
  LICENSING: 'Licenciamento',
  CRLV: 'CRLV',
  OTHER: 'Outro documento',
};

@Entity('documents')
@Index(['vehicleId', 'type', 'year'])
export class VehicleDocument extends BaseEntity {
  @Column({ type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Vehicle;

  @Column({ type: 'varchar', length: 12 })
  type: DocumentType;

  @Column({ type: 'smallint', nullable: true })
  year: number | null;

  @Column({ type: 'integer', nullable: true })
  amountCents: number | null;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'date', nullable: true })
  paidAt: string | null;

  @Column({ type: 'uuid', nullable: true })
  expenseId: string | null;

  @Column({ type: 'uuid', nullable: true })
  fileId: string | null;

  @ManyToOne(() => StoredFile, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'file_id' })
  file?: StoredFile;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notes: string | null;
}
