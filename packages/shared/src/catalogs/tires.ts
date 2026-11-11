export const TIRE_POSITIONS = ['DE', 'DD', 'TE', 'TD'] as const;
export const TIRE_SPARE = 'EST';
export const TIRE_SLOTS = [...TIRE_POSITIONS, TIRE_SPARE] as const;

export type TirePosition = (typeof TIRE_POSITIONS)[number];
export type TireSlot = (typeof TIRE_SLOTS)[number];

export const TIRE_SLOT_NAMES: Record<TireSlot, string> = {
  DE: 'Dianteiro esquerdo',
  DD: 'Dianteiro direito',
  TE: 'Traseiro esquerdo',
  TD: 'Traseiro direito',
  EST: 'Estepe',
};

export const TIRE_DAMAGE_TYPES = ['Prego', 'Furo', 'Corte', 'Bolha', 'Desgaste irregular', 'Outro'] as const;
export const TIRE_SEVERITIES = ['Leve', 'Moderada', 'Grave'] as const;
export const TIRE_ROTATION_KINDS = ['SUGGESTED', 'PARALLEL', 'CUSTOM'] as const;

export type TireSeverity = (typeof TIRE_SEVERITIES)[number];
export type TireRotationKind = (typeof TIRE_ROTATION_KINDS)[number];

export const TIRE_ROTATION_KIND_NAMES: Record<TireRotationKind | 'NEW_SET', string> = {
  SUGGESTED: 'Cruzado, sugerido',
  PARALLEL: 'Paralelo',
  CUSTOM: 'Personalizado',
  NEW_SET: 'Jogo novo instalado',
};

export const REAR_WEAR_FACTOR = 0.7;

export const isFrontTire = (slot: TireSlot) => slot === 'DE' || slot === 'DD';

export function tireEquivalentKm(tire: { frontKm: number; rearKm: number; baseOdometer: number }, slot: TirePosition, odometer: number) {
  const run = Math.max(0, odometer - tire.baseOdometer);
  return tire.frontKm + tire.rearKm * REAR_WEAR_FACTOR + run * (isFrontTire(slot) ? 1 : REAR_WEAR_FACTOR);
}

export function suggestedRotation<T>(current: Record<TirePosition, T>): Record<TirePosition, T> {
  return { DE: current.TD, DD: current.TE, TE: current.DE, TD: current.DD };
}

export function parallelRotation<T>(current: Record<TirePosition, T>): Record<TirePosition, T> {
  return { DE: current.TE, DD: current.TD, TE: current.DE, TD: current.DD };
}
