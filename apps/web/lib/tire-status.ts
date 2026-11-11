import { TIRE_POSITIONS, TIRE_SLOT_NAMES, isFrontTire, tireEquivalentKm, type TirePosition, type TireSlot } from "@monitoring-car/shared";
import type { Tire, TireOverview, TireSettings } from "@/lib/api/tires";
import { km } from "@/lib/format";

export type TireLevel = 0 | 1 | 2;

export const LEVEL_COLOR = ["var(--green)", "var(--orange)", "var(--danger)"] as const;
export const LEVEL_TEXT = ["Bom estado", "Pede atenção", "Resolver já"] as const;
export const SPARE_MAX_YEARS = 5;

const psi = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const psiText = psi;

export function recommendedPsi(settings: TireSettings, slot: TireSlot, loaded = false) {
  if (slot === "EST") return settings.psiSpare;
  if (isFrontTire(slot)) return loaded ? settings.psiLoadedFront : settings.psiFront;
  return loaded ? settings.psiLoadedRear : settings.psiRear;
}

export function pressureLevel(current: number | null, recommended: number): TireLevel {
  if (current === null) return 0;
  const diff = current - recommended;
  if (diff <= -2.5) return 2;
  if (diff <= -1.5 || diff >= 2.5) return 1;
  return 0;
}

export function tireStatus(tire: Tire, overview: TireOverview, loaded: boolean, year: number) {
  const slot = tire.position;
  const spare = slot === "EST";
  const odometer = overview.odometer;
  const recommended = recommendedPsi(overview.settings, slot, loaded);
  const run = Math.max(0, odometer - tire.baseOdometer);
  const equivalent = spare ? 0 : tireEquivalentKm(tire, slot as TirePosition, odometer);
  const used = spare ? 0 : Math.min(100, (equivalent / tire.lifeKm) * 100);
  const percent = Math.round(100 - used);
  const pressure = pressureLevel(tire.pressurePsi, recommended);
  const issues: string[] = [];
  let level: TireLevel = pressure;
  if (pressure && tire.pressurePsi !== null) {
    const diff = tire.pressurePsi - recommended;
    issues.push(`Pressão ${psi(Math.abs(diff))} psi ${diff < 0 ? "abaixo" : "acima"}`);
  }
  for (const event of tire.events) {
    if (event.kind !== "DAMAGE" || event.repaired) continue;
    issues.push(`${event.damageType} em observação`);
    level = Math.max(level, event.severity === "Grave" ? 2 : 1) as TireLevel;
  }
  if (!spare && used >= 95) {
    issues.push("Fim da vida útil");
    level = 2;
  } else if (!spare && used >= 80) {
    issues.push("Perto do fim da vida útil");
    level = Math.max(level, 1) as TireLevel;
  }
  if (spare && tire.manufactureYear && year - tire.manufactureYear >= SPARE_MAX_YEARS) {
    issues.push(`${year - tire.manufactureYear} anos de fabricação, avalie a troca`);
    level = Math.max(level, 1) as TireLevel;
  }
  const frontKm = tire.frontKm + (isFrontTire(slot) ? run : 0);
  const rearKm = tire.rearKm + (!spare && !isFrontTire(slot) ? run : 0);
  return {
    slot,
    name: TIRE_SLOT_NAMES[slot],
    label: spare ? "Estepe" : `Pneu ${tire.number}`,
    fullName: `${tire.brand} ${tire.model}`,
    spare,
    percent,
    percentText: spare ? "Novo" : `${percent}%`,
    lifeLabel: spare ? "sem uso" : "vida restante",
    level,
    color: LEVEL_COLOR[level],
    statusText: LEVEL_TEXT[level],
    pressureColor: LEVEL_COLOR[pressure],
    recommended,
    issues,
    frontKm,
    rearKm,
    totalKm: frontKm + rearKm,
    remainingKm: spare ? 0 : Math.max(0, Math.round((tire.lifeKm - equivalent) / 0.85 / 100) * 100),
  };
}

export type TireStatus = ReturnType<typeof tireStatus>;

export function rotationStatus(overview: TireOverview) {
  const last = overview.lastRotationKm ?? overview.odometer;
  const interval = overview.settings.rotationKm;
  const next = last + interval;
  const left = next - overview.odometer;
  const percent = Math.min(100, Math.max(0, ((overview.odometer - last) / interval) * 100));
  return {
    last,
    next,
    left,
    percent,
    leftText: left > 0 ? `Faltam ${km(left)}` : `Atrasado ${km(-left)}`,
    color: left <= 0 ? "var(--danger)" : left <= 3000 ? "var(--orange)" : "var(--ios-tint)",
  };
}

export function attentionTitle(statuses: TireStatus[]) {
  const count = statuses.filter((status) => status.level > 0 && !status.spare).length;
  if (!count) return "Pneus em dia";
  return `${count} ${count > 1 ? "pneus pedem" : "pneu pede"} atenção`;
}

export const mountedPositions = (tires: Tire[]) =>
  Object.fromEntries(TIRE_POSITIONS.map((position) => [position, tires.find((tire) => tire.position === position)!.id])) as Record<TirePosition, string>;
