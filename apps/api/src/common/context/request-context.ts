import { ClsService, ClsServiceManager, ClsStore } from 'nestjs-cls';

export interface RequestContextStore extends ClsStore {
  userId?: string;
  ip?: string;
  userAgent?: string;
}

export type RequestContext = ClsService<RequestContextStore>;

export function currentRequestContext(): {
  userId: string | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
} {
  const cls = ClsServiceManager.getClsService<RequestContextStore>();
  if (!cls?.isActive()) return { userId: null, ip: null, userAgent: null, requestId: null };
  return {
    userId: cls.get('userId') ?? null,
    ip: cls.get('ip') ?? null,
    userAgent: cls.get('userAgent') ?? null,
    requestId: cls.getId() ?? null,
  };
}
