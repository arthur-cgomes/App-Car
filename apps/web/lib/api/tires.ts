import type { TirePosition, TireRotationKind, TireSeverity, TireSlot } from "@monitoring-car/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export interface TireEvent {
  id: string;
  kind: "INSTALLED" | "ROTATION" | "PRESSURE" | "DAMAGE" | "REMOVED";
  date: string;
  odometer: number;
  description: string;
  pressurePsi: number | null;
  damageType: string | null;
  severity: TireSeverity | null;
  repaired: boolean;
  costCents: number | null;
  notes: string | null;
  fileId: string | null;
}

export interface Tire {
  id: string;
  number: number;
  position: TireSlot;
  brand: string;
  model: string;
  size: string;
  priceCents: number | null;
  installedOdometer: number;
  installedDate: string;
  store: string | null;
  lifeKm: number;
  frontKm: number;
  rearKm: number;
  baseOdometer: number;
  pressurePsi: number | null;
  manufactureYear: number | null;
  treadFileId: string | null;
  sideFileId: string | null;
  events: TireEvent[];
}

export interface TireSettings {
  rotationKm: number;
  psiFront: number;
  psiRear: number;
  psiLoadedFront: number;
  psiLoadedRear: number;
  psiSpare: number;
}

export interface TireOverview {
  odometer: number;
  settings: TireSettings;
  lastRotationKm: number | null;
  rotations: { id: string; date: string; odometer: number; kind: TireRotationKind | "NEW_SET" }[];
  tires: Tire[];
}

export interface TireModelInput {
  brand: string;
  model: string;
  size: string;
  priceCents: number | null;
  lifeKm: number;
  store: string | null;
}

export interface TireSetupInput extends TireModelInput {
  installedOdometer: number;
  installedDate: string;
  spareSize: string | null;
  spareYear: number | null;
  settings: Partial<TireSettings>;
}

export interface OccurrenceInput {
  position: TireSlot;
  damageType: string;
  severity: TireSeverity;
  repaired: boolean;
  costCents: number | null;
  notes: string | null;
  fileId: string | null;
}

const base = (vehicleId: string) => `/vehicles/${vehicleId}/tires`;

export const tiresApi = {
  setup: (vehicleId: string, input: TireSetupInput) => api<TireOverview>(base(vehicleId), { body: input }),
  settings: (vehicleId: string, input: Partial<TireSettings>) => api<TireSettings>(`${base(vehicleId)}/settings`, { method: "PATCH", body: input }),
  calibrate: (vehicleId: string, values: Partial<Record<TireSlot, number>>) => api<TireOverview>(`${base(vehicleId)}/pressure`, { body: { values } }),
  rotate: (vehicleId: string, input: { kind: TireRotationKind; odometer: number; positions: Record<TirePosition, string> }) =>
    api<TireOverview>(`${base(vehicleId)}/rotations`, { body: input }),
  occurrence: (vehicleId: string, input: OccurrenceInput) => api<TireOverview>(`${base(vehicleId)}/occurrences`, { body: input }),
  repaired: (vehicleId: string, eventId: string) => api<TireOverview>(`${base(vehicleId)}/occurrences/${eventId}/repaired`, { body: {} }),
  replace: (vehicleId: string, input: TireModelInput & { position: TireSlot }) => api<TireOverview>(`${base(vehicleId)}/replacements`, { body: input }),
  photos: (vehicleId: string, tireId: string, input: { treadFileId?: string | null; sideFileId?: string | null }) =>
    api<TireOverview>(`${base(vehicleId)}/${tireId}/photos`, { method: "PATCH", body: input }),
};

export function useTires(vehicleId: string | undefined) {
  return useQuery({ queryKey: ["tires", vehicleId], enabled: !!vehicleId, queryFn: () => api<TireOverview>(base(vehicleId!)) });
}

export function useTireMutation<TInput>(vehicleId: string, request: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      void Promise.all([
        client.invalidateQueries({ queryKey: ["tires", vehicleId] }),
        client.invalidateQueries({ queryKey: ["expenses", vehicleId] }),
        client.invalidateQueries({ queryKey: ["reminders", vehicleId] }),
        client.invalidateQueries({ queryKey: ["vehicles"] }),
      ]);
    },
  });
}
