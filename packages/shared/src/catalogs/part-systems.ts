export const PART_SYSTEMS = [
  { code: 'ENGINE', name: 'Motor' },
  { code: 'BRAKES', name: 'Freios' },
  { code: 'SUSPENSION', name: 'Suspensão e direção' },
  { code: 'TIRES', name: 'Pneus e rodas' },
  { code: 'ELECTRICAL', name: 'Elétrica e bateria' },
  { code: 'FILTERS', name: 'Filtros e fluidos' },
  { code: 'TRANSMISSION', name: 'Câmbio e embreagem' },
  { code: 'AC', name: 'Ar-condicionado' },
  { code: 'BODY', name: 'Carroceria e vidros' },
  { code: 'OTHER', name: 'Outras peças' },
] as const;

export type PartSystemCode = (typeof PART_SYSTEMS)[number]['code'];

export const PART_SYSTEM_BY_CODE = Object.fromEntries(
  PART_SYSTEMS.map((system) => [system.code, system]),
) as Record<PartSystemCode, (typeof PART_SYSTEMS)[number]>;
