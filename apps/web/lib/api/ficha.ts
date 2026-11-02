import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Vehicle } from "./vehicles";

export type DocumentType = "IPVA" | "LICENSING" | "CRLV" | "OTHER";

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "IPVA", label: "IPVA" },
  { value: "LICENSING", label: "Licenciamento" },
  { value: "CRLV", label: "CRLV" },
  { value: "OTHER", label: "Outro" },
];

export const documentTypeName = (type: DocumentType) => (type === "OTHER" ? "Outro documento" : DOCUMENT_TYPES.find((t) => t.value === type)!.label);

export interface VehicleDocument {
  id: string;
  type: DocumentType;
  year: number | null;
  amountCents: number | null;
  dueDate: string | null;
  paidAt: string | null;
  expenseId: string | null;
  fileId: string | null;
  notes: string | null;
}

export type DocumentInput = Omit<VehicleDocument, "id" | "paidAt" | "expenseId">;

export interface Insurance {
  id: string;
  insurer: string;
  policyNumber: string | null;
  startDate: string;
  endDate: string;
  premiumCents: number | null;
  installments: number | null;
  deductibleCents: number | null;
  brokerContact: string | null;
  fileId: string | null;
}

export type InsuranceInput = Omit<Insurance, "id">;

export interface FuelStats {
  averageKmPerLiter: number | null;
  averagePricePerLiterCents: number | null;
  totalLiters: number;
  totalCents: number;
  fills: {
    expenseId: string;
    date: string;
    odometer: number | null;
    liters: number;
    fullTank: boolean;
    amountCents: number;
    pricePerLiterCents: number;
    kmPerLiter: number | null;
  }[];
}

export interface Report {
  from: string;
  to: string;
  totalCents: number;
  count: number;
  byCategory: { code: string; name: string; cents: number; count: number }[];
  byPartSystem: { code: string; name: string; cents: number }[];
  byMonth: { month: string; cents: number }[];
  costs: { partsCents: number; laborCents: number; maintenanceUnsplitCents: number };
}

export type Fipe = { available: false } | { available: true; manual: boolean; code: string | null; valueCents: number; referenceMonth: string | null; ipvaEstimateCents: number };

const v = (vehicleId: string) => `/vehicles/${vehicleId}`;

export function useFipe(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ["fipe", vehicleId],
    enabled: !!vehicleId,
    staleTime: 60 * 60_000,
    queryFn: () => api<Fipe>(`${v(vehicleId!)}/fipe`),
  });
}

export function useDocuments(vehicleId: string | undefined) {
  return useQuery({ queryKey: ["documents", vehicleId], enabled: !!vehicleId, queryFn: () => api<VehicleDocument[]>(`${v(vehicleId!)}/documents`) });
}

export function useInsurances(vehicleId: string | undefined) {
  return useQuery({ queryKey: ["insurances", vehicleId], enabled: !!vehicleId, queryFn: () => api<Insurance[]>(`${v(vehicleId!)}/insurances`) });
}

export function useFuelStats(vehicleId: string | undefined) {
  return useQuery({ queryKey: ["expenses", vehicleId, "fuel-stats"], enabled: !!vehicleId, queryFn: () => api<FuelStats>(`${v(vehicleId!)}/fuel-stats`) });
}

export function useReport(vehicleId: string | undefined, from: string | null, to: string | null) {
  return useQuery({
    queryKey: ["expenses", vehicleId, "report", from, to],
    enabled: !!vehicleId && !!from && !!to,
    queryFn: () => api<Report>(`${v(vehicleId!)}/reports?from=${from}&to=${to}`),
  });
}

export const reportDownloadUrl = (vehicleId: string, from: string, to: string, format: "csv" | "pdf") =>
  `/api/v1${v(vehicleId)}/reports?from=${from}&to=${to}&format=${format}`;

export function useFichaMutation<TInput>(resource: "documents" | "insurances", vehicleId: string, request: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: [resource, vehicleId] }),
        client.invalidateQueries({ queryKey: ["expenses", vehicleId] }),
        client.invalidateQueries({ queryKey: ["reminders", vehicleId] }),
      ]),
  });
}

export const fichaApi = {
  saveDocument: (vehicleId: string, input: DocumentInput, id?: string) =>
    id ? api(`${v(vehicleId)}/documents/${id}`, { method: "PATCH", body: input }) : api(`${v(vehicleId)}/documents`, { body: input }),
  deleteDocument: (vehicleId: string, id: string) => api(`${v(vehicleId)}/documents/${id}`, { method: "DELETE" }),
  payDocument: (vehicleId: string, id: string) => api(`${v(vehicleId)}/documents/${id}/pay`, { body: {} }),
  saveInsurance: (vehicleId: string, input: InsuranceInput, id?: string) =>
    id ? api(`${v(vehicleId)}/insurances/${id}`, { method: "PATCH", body: input }) : api(`${v(vehicleId)}/insurances`, { body: input }),
  deleteInsurance: (vehicleId: string, id: string) => api(`${v(vehicleId)}/insurances/${id}`, { method: "DELETE" }),
  updateVehicle: (vehicleId: string, body: { serviceIntervalKm?: number; currentOdometer?: number; fipeValueCents?: number | null }) =>
    api<Vehicle>(v(vehicleId), { method: "PATCH", body }),
  deleteVehicle: (vehicleId: string) => api(v(vehicleId), { method: "DELETE" }),
};
