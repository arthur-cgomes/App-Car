export const EMERGENCY_CONTACT_KINDS = [
  { code: 'INSURANCE', name: 'Seguradora', icon: 'shield' },
  { code: 'ASSISTANCE', name: 'Guincho e assistência 24h', icon: 'truck' },
  { code: 'HIGHWAY', name: 'Concessionária da rodovia', icon: 'road' },
  { code: 'DEALER', name: 'Concessionária ou oficina', icon: 'wrench' },
  { code: 'TIRE_SHOP', name: 'Borracharia', icon: 'wrench' },
  { code: 'OTHER', name: 'Outro', icon: 'phone' },
] as const;

export type EmergencyContactKind = (typeof EMERGENCY_CONTACT_KINDS)[number]['code'];

export const EMERGENCY_CONTACT_KIND_BY_CODE = Object.fromEntries(
  EMERGENCY_CONTACT_KINDS.map((kind) => [kind.code, kind]),
) as Record<EmergencyContactKind, (typeof EMERGENCY_CONTACT_KINDS)[number]>;
