import { Column, Entity, EntityManager, Index } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { BaseAppendOnlyEntity } from '../common/entities/base-append-only.entity';

export type AuditAction = 'CREATE' | 'UPDATE' | 'SOFT_DELETE' | 'RESTORE' | 'DELETE' | 'SECURITY';

export type AuditChanges = Record<string, { from: unknown; to: unknown }>;

@Entity('audit_logs')
@Index(['entity', 'entityId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class AuditLog extends BaseAppendOnlyEntity {
  @Column({ type: 'varchar', length: 100 })
  entity: string;

  @Column({ type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ type: 'varchar', length: 20 })
  action: AuditAction;

  @Column({ type: 'jsonb', nullable: true })
  changes: AuditChanges | null;

  @Column({ type: 'jsonb', nullable: true })
  snapshot: Record<string, unknown> | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  requestId: string | null;
}

export type NewAuditLog = Omit<AuditLog, 'id' | 'createdAt'>;

export function insertAuditLog(manager: EntityManager, log: NewAuditLog) {
  return manager.insert(AuditLog, log as QueryDeepPartialEntity<AuditLog>);
}
