import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../users/user.entity';

@Entity('files')
@Index(['ownerId'])
export class StoredFile extends BaseEntity {
  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner?: User;

  @Column({ type: 'varchar', length: 200 })
  storageKey: string;

  @Column({ type: 'varchar', length: 50 })
  mime: string;

  @Column({ type: 'integer' })
  size: number;

  @Column({ type: 'char', length: 64 })
  sha256: string;
}
