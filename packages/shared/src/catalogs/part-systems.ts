export const PART_SYSTEM_CHOICES = [
  { code: 'ENGINE', name: 'Motor' },
  { code: 'BRAKES', name: 'Freios' },
  { code: 'SUSPENSION', name: 'Suspensão' },
  { code: 'ELECTRICAL', name: 'Elétrica' },
  { code: 'COOLING', name: 'Arrefecimento' },
  { code: 'TRANSMISSION', name: 'Câmbio' },
  { code: 'TIRES', name: 'Pneus e rodas' },
  { code: 'BODY', name: 'Carroceria' },
] as const;

export const PART_SYSTEMS = [
  ...PART_SYSTEM_CHOICES,
  { code: 'FILTERS', name: 'Filtros e fluidos' },
  { code: 'AC', name: 'Ar-condicionado' },
  { code: 'OTHER', name: 'Outras peças' },
] as const;

export type PartSystemCode = (typeof PART_SYSTEMS)[number]['code'];

export const PART_SYSTEM_BY_CODE = Object.fromEntries(
  PART_SYSTEMS.map((system) => [system.code, system]),
) as Record<PartSystemCode, (typeof PART_SYSTEMS)[number]>;
