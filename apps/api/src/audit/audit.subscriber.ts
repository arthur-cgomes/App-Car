import {
  EntityManager,
  EntityMetadata,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RecoverEvent,
  RemoveEvent,
  SoftRemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { currentRequestContext } from '../common/context/request-context';
import { getAuditIgnoredProperties } from '../common/decorators/audit-ignore.decorator';
import { BaseEntity } from '../common/entities/base.entity';
import { buildChanges, buildSnapshot } from './audit-diff';
import { AuditAction, AuditChanges, insertAuditLog } from './audit-log.entity';

type AnyRecord = Record<string, unknown>;

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<BaseEntity> {
  listenTo() {
    return BaseEntity;
  }

  beforeInsert(event: InsertEvent<BaseEntity>) {
    const { userId } = currentRequestContext();
    if (!userId || !event.entity) return;
    event.entity.createdBy ??= userId;
    event.entity.updatedBy ??= userId;
  }

  beforeUpdate(event: UpdateEvent<BaseEntity>) {
    const { userId } = currentRequestContext();
    if (userId && event.entity) event.entity.updatedBy = userId;
  }

  async afterInsert(event: InsertEvent<BaseEntity>) {
    await this.write(event.manager, event.metadata, 'CREATE', event.entity, {
      snapshot: this.snapshot(event.metadata, event.entity),
    });
  }

  async afterUpdate(event: UpdateEvent<BaseEntity>) {
    if (!event.entity || !event.databaseEntity) return;
    const properties = event.updatedColumns.map((column) => column.propertyName);
    const changes = buildChanges(
      event.databaseEntity as unknown as AnyRecord,
      event.entity as AnyRecord,
      properties,
      this.ignored(event.metadata),
    );
    if (Object.keys(changes).length === 0) return;
    await this.write(event.manager, event.metadata, 'UPDATE', event.entity, {
      changes,
      snapshot: this.snapshot(event.metadata, event.entity),
    });
  }

  async afterSoftRemove(event: SoftRemoveEvent<BaseEntity>) {
    await this.write(event.manager, event.metadata, 'SOFT_DELETE', event.entity ?? event.databaseEntity);
  }

  async afterRecover(event: RecoverEvent<BaseEntity>) {
    await this.write(event.manager, event.metadata, 'RESTORE', event.entity ?? event.databaseEntity);
  }

  async afterRemove(event: RemoveEvent<BaseEntity>) {
    const entity = event.databaseEntity ?? event.entity;
    await this.write(event.manager, event.metadata, 'DELETE', entity, {
      entityId: this.idOf(entity) ?? (event.entityId as string | undefined),
      snapshot: entity ? this.snapshot(event.metadata, entity) : null,
    });
  }

  private async write(
    manager: EntityManager,
    metadata: EntityMetadata,
    action: AuditAction,
    entity: AnyRecord | BaseEntity | undefined,
    extra: { changes?: AuditChanges; snapshot?: AnyRecord | null; entityId?: string } = {},
  ) {
    const context = currentRequestContext();
    await insertAuditLog(manager, {
      entity: metadata.name,
      entityId: extra.entityId ?? this.idOf(entity) ?? null,
      action,
      changes: extra.changes ?? null,
      snapshot: extra.snapshot ?? null,
      userId: context.userId,
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });
  }

  private snapshot(metadata: EntityMetadata, entity: AnyRecord | BaseEntity | undefined) {
    if (!entity) return null;
    const properties = metadata.columns.map((column) => column.propertyName);
    return buildSnapshot(entity as AnyRecord, properties, this.ignored(metadata));
  }

  private ignored(metadata: EntityMetadata) {
    return getAuditIgnoredProperties((metadata.target as { prototype: object }).prototype);
  }

  private idOf(entity: AnyRecord | BaseEntity | undefined): string | undefined {
    return (entity as AnyRecord | undefined)?.id as string | undefined;
  }
}
