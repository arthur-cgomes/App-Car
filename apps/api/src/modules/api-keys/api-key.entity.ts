import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AuditIgnore } from '../../common/decorators/audit-ignore.decorator';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../users/user.entity';

@Entity('api_keys')
@Index(['userId'])
@Index('uq_api_keys_key_hash', ['keyHash'], { unique: true })
export class ApiKey extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', length: 60 })
  name: string;

  @Column({ type: 'varchar', length: 16 })
  prefix: string;

  @AuditIgnore()
  @Column({ type: 'char', length: 64, select: false })
  keyHash: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;
}
