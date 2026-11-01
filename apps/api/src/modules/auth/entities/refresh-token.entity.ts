import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTechnicalEntity } from '../../../common/entities/base-technical.entity';
import { User } from '../../users/user.entity';

@Entity('refresh_tokens')
@Index('uq_refresh_tokens_token_hash', ['tokenHash'], { unique: true })
@Index(['familyId'])
@Index(['userId'])
export class RefreshToken extends BaseTechnicalEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'char', length: 64 })
  tokenHash: string;

  @Column({ type: 'uuid' })
  familyId: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;
}
