import type { PinChannel } from '@monitoring-car/shared';
import { Column, Entity, Index } from 'typeorm';
import { AuditIgnore } from '../../common/decorators/audit-ignore.decorator';
import { BaseEntity } from '../../common/entities/base.entity';

export type UserTheme = 'DARK' | 'LIGHT';

@Entity('users')
@Index('uq_users_email', ['email'], { unique: true, where: '"deleted_at" IS NULL' })
@Index('uq_users_cpf', ['cpf'], { unique: true, where: '"deleted_at" IS NULL' })
@Index('uq_users_phone_verified', ['phone'], { unique: true, where: '"deleted_at" IS NULL AND "phone_verified_at" IS NOT NULL' })
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Column({ type: 'varchar', length: 11, nullable: true })
  cpf: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @AuditIgnore()
  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ type: 'timestamptz', nullable: true })
  phoneVerifiedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  avatarFileId: string | null;

  @Column({ type: 'varchar', length: 5, default: 'DARK' })
  theme: UserTheme;

  @Column({ type: 'boolean', default: true })
  pinLoginEnabled: boolean;

  @Column({ type: 'varchar', length: 5, default: 'EMAIL' })
  pinChannel: PinChannel;

  @Column({ type: 'uuid', nullable: true })
  activeVehicleId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  termsAcceptedAt: Date | null;
}
