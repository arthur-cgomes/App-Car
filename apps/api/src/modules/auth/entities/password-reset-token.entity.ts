import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseTechnicalEntity } from '../../../common/entities/base-technical.entity';
import { User } from '../../users/user.entity';

@Entity('password_reset_tokens')
@Index('uq_password_reset_tokens_token_hash', ['tokenHash'], { unique: true })
@Index(['userId'])
export class PasswordResetToken extends BaseTechnicalEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'char', length: 64 })
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date | null;
}
