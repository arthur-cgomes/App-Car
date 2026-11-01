import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTechnicalEntity } from '../../../common/entities/base-technical.entity';
import { User } from '../../users/user.entity';

@Entity('plate_lookup_history')
@Index('uq_plate_lookup_history_user_id_plate', ['userId', 'plate'], { unique: true })
@Index(['userId', 'updatedAt'])
export class PlateLookupHistory extends BaseTechnicalEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', length: 7 })
  plate: string;
}
