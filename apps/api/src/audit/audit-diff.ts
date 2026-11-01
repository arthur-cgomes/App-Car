import { AuditChanges } from './audit-log.entity';

export const REDACTED = '[REDACTED]';

const NOISE_PROPERTIES = new Set(['updatedAt', 'updatedBy', 'version']);

function serialize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value === undefined ? null : value;
}

function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(serialize(a)) === JSON.stringify(serialize(b));
}

export function buildSnapshot(
  record: Record<string, unknown>,
  properties: string[],
  ignored: Set<string>,
): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const property of properties) {
    if (ignored.has(property)) continue;
    snapshot[property] = serialize(record[property]);
  }
  return snapshot;
}

export function buildChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  properties: string[],
  ignored: Set<string>,
): AuditChanges {
  const changes: AuditChanges = {};
  for (const property of properties) {
    if (NOISE_PROPERTIES.has(property)) continue;
    if (isEqual(before[property], after[property])) continue;
    changes[property] = ignored.has(property)
      ? { from: REDACTED, to: REDACTED }
      : { from: serialize(before[property]), to: serialize(after[property]) };
  }
  return changes;
}
