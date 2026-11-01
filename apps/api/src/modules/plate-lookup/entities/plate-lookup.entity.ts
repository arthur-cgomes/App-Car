import { Column, Entity, Index } from 'typeorm';
import { BaseTechnicalEntity } from '../../../common/entities/base-technical.entity';

export type PlateLookupKind = 'VEHICLE' | 'DEBTS';

@Entity('plate_lookups')
@Index(['plate', 'kind', 'expiresAt'])
export class PlateLookup extends BaseTechnicalEntity {
  @Column({ type: 'varchar', length: 7 })
  plate: string;

  @Column({ type: 'varchar', length: 10 })
  kind: PlateLookupKind;

  @Column({ type: 'varchar', length: 30 })
  provider: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: unknown;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;
}
