import { describe, expect, it } from "vitest";
import type { Tire, TireOverview } from "@/lib/api/tires";
import { attentionTitle, pressureLevel, recommendedPsi, rotationStatus, tireStatus } from "./tire-status";

const settings = { rotationKm: 15000, psiFront: 33, psiRear: 33, psiLoadedFront: 36, psiLoadedRear: 41, psiSpare: 35 };
const tire = (overrides: Partial<Tire> = {}) =>
  ({ number: 1, position: "DE", brand: "Pirelli", model: "P7", size: "205/50 R17", lifeKm: 55000, frontKm: 0, rearKm: 0, baseOdometer: 40000, pressurePsi: 33, manufactureYear: null, events: [], ...overrides }) as unknown as Tire;
const overview = (overrides: Partial<TireOverview> = {}) => ({ odometer: 60000, settings, lastRotationKm: 56000, rotations: [], tires: [], ...overrides }) as TireOverview;

describe("estado dos pneus", () => {
  it("usa a pressão do carro carregado", () => {
    expect(recommendedPsi(settings, "DE", true)).toBe(36);
    expect(recommendedPsi(settings, "TD", true)).toBe(41);
    expect(recommendedPsi(settings, "EST", true)).toBe(35);
  });

  it("classifica a pressão pela diferença", () => {
    expect(pressureLevel(32, 33)).toBe(0);
    expect(pressureLevel(31, 33)).toBe(1);
    expect(pressureLevel(30, 33)).toBe(2);
    expect(pressureLevel(36, 33)).toBe(1);
  });

  it("calcula a vida restante e alerta perto do fim", () => {
    const status = tireStatus(tire({ frontKm: 25000 }), overview(), false, 2026);
    expect(status.percent).toBe(18);
    expect(status.level).toBe(1);
    expect(status.issues).toContain("Perto do fim da vida útil");
  });

  it("dano em observação pesa e dano consertado não", () => {
    const damage = { kind: "DAMAGE", damageType: "Corte", severity: "Grave", repaired: false };
    expect(tireStatus(tire({ events: [damage] as Tire["events"] }), overview(), false, 2026).level).toBe(2);
    expect(tireStatus(tire({ events: [{ ...damage, repaired: true }] as Tire["events"] }), overview(), false, 2026).level).toBe(0);
  });

  it("estepe velho pede atenção", () => {
    const status = tireStatus(tire({ position: "EST", manufactureYear: 2019, pressurePsi: 35 }), overview(), false, 2026);
    expect(status.issues).toEqual(["7 anos de fabricação, avalie a troca"]);
  });

  it("mostra quanto falta para o rodízio", () => {
    expect(rotationStatus(overview()).leftText).toBe("Faltam 11.000 km");
    expect(rotationStatus(overview({ odometer: 72000 })).leftText).toBe("Atrasado 1.000 km");
    expect(attentionTitle([])).toBe("Pneus em dia");
  });
});
