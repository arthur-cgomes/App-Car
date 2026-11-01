import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMe } from "./auth";
import { api } from "./client";

export interface Vehicle {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  modelVersion: string | null;
  yearFab: number | null;
  yearModel: number | null;
  color: string | null;
  fuelType: string | null;
  municipality: string | null;
  uf: string | null;
  restrictions: string | null;
  currentOdometer: number;
  serviceIntervalKm: number;
  purchaseDate: string | null;
}

export interface NewVehicle {
  plate: string;
  currentOdometer: number;
  purchaseDate: string | null;
  manual?: { brand: string; model: string; modelVersion: string | null; color: string | null };
}

export interface PlateVehicleData {
  brand: string;
  model: string;
  yearFab: number;
  yearModel: number;
  color: string;
  fuelType: string;
  municipality: string;
  uf: string;
  restrictions: string;
}

export interface PlateDebt {
  type: "IPVA" | "LICENSING" | "FINE" | "OTHER";
  description: string;
  amountCents: number;
  status: "OPEN" | "PAID";
  dueDate: string | null;
}

export interface PlateConsultation {
  plate: string;
  vehicle: PlateVehicleData;
  debts: PlateDebt[];
  openCents: number;
  checkedAt: string;
}

export const vehicleName = (v: Pick<Vehicle, "brand" | "model">) => [v.brand, v.model].filter(Boolean).join(" ") || "Veículo";
export const vehicleYears = (v: Pick<Vehicle, "yearFab" | "yearModel">) =>
  v.yearFab && v.yearModel ? `${v.yearFab}/${v.yearModel}` : "";
export const vehiclePlace = (v: Pick<Vehicle, "municipality" | "uf">) => [v.municipality, v.uf].filter(Boolean).join("/");

export const plateApi = {
  vehicleData: (plate: string) => api<PlateVehicleData>(`/plates/${plate}/vehicle`, { body: {} }),
  consult: (plate: string) => api<PlateConsultation>(`/plates/${plate}/lookup`, { body: {} }),
};

export function useVehicles() {
  return useQuery({ queryKey: ["vehicles"], queryFn: () => api<Vehicle[]>("/vehicles") });
}

export function useActiveVehicle() {
  const me = useMe();
  const vehicles = useVehicles();
  const list = vehicles.data ?? [];
  return {
    vehicle: list.find((v) => v.id === me.data?.activeVehicleId) ?? list[0] ?? null,
    vehicles: list,
    isLoading: me.isLoading || vehicles.isLoading,
  };
}

export function usePlateHistory() {
  return useQuery({ queryKey: ["plates", "history"], queryFn: () => api<string[]>("/plates/history") });
}

export function useAddVehicle() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: NewVehicle) => api<Vehicle>("/vehicles", { body }),
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ["vehicles"] }), client.invalidateQueries({ queryKey: ["me"] })]),
  });
}

export function useActivateVehicle() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<Vehicle>(`/vehicles/${id}/activate`, { method: "POST" }),
    onMutate: (id) => client.setQueryData(["me"], (me: { activeVehicleId: string | null } | undefined) => me && { ...me, activeVehicleId: id }),
    onSettled: () => client.invalidateQueries({ queryKey: ["me"] }),
  });
}
