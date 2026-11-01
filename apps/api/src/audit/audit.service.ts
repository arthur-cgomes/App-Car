import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { currentRequestContext } from '../common/context/request-context';
import { AuditLog, insertAuditLog } from './audit-log.entity';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>) {}

  findForEntity(entity: string, entityId: string, take = 50) {
    return this.logs.find({
      where: { entity, entityId },
      order: { createdAt: 'DESC' },
      take,
    });
  }

  async logSecurityEvent(event: string, metadata: Record<string, unknown> = {}, userId?: string) {
    const context = currentRequestContext();
    await insertAuditLog(this.logs.manager, {
      entity: 'Security',
      entityId: null,
      action: 'SECURITY',
      changes: null,
      snapshot: { event, ...metadata },
      userId: userId ?? context.userId,
      ip: context.ip,
      userAgent: context.userAgent,
      requestId: context.requestId,
    });
  }
}
