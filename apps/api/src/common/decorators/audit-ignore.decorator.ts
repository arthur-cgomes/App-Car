import 'reflect-metadata';

const AUDIT_IGNORE_KEY = Symbol('audit:ignore');

export function AuditIgnore(): PropertyDecorator {
  return (target, propertyKey) => {
    const current: string[] = Reflect.getMetadata(AUDIT_IGNORE_KEY, target) ?? [];
    Reflect.defineMetadata(AUDIT_IGNORE_KEY, [...current, String(propertyKey)], target);
  };
}

export function getAuditIgnoredProperties(target: object): Set<string> {
  return new Set<string>(Reflect.getMetadata(AUDIT_IGNORE_KEY, target) ?? []);
}
