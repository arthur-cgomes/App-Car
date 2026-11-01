import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BaseTechnicalEntity } from '../../../common/entities/base-technical.entity';
import { User } from '../../users/user.entity';

export type OtpPurpose = 'LOGIN' | 'PHONE_VERIFY' | 'PHONE_CHANGE' | 'ACCOUNT_DELETE';

@Entity('auth_otps')
@Index(['userId', 'purpose', 'createdAt'])
export class AuthOtp extends BaseTechnicalEntity {
  @PrimaryColumn('uuid')
  declare id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'uuid', nullable: true })
  vehicleId: string | null;

  @Column({ type: 'varchar', length: 20 })
  purpose: OtpPurpose;

  @Column({ type: 'varchar', length: 20 })
  targetPhone: string;

  @Column({ type: 'char', length: 64 })
  codeHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'smallint', default: 0 })
  attempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  consumedAt: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;
}
