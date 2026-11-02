import type { EmergencyContactKind } from "@monitoring-car/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export interface EmergencyContact {
  id: string;
  kind: EmergencyContactKind;
  name: string;
  phone: string;
  notes: string | null;
}

export type EmergencyContactInput = Omit<EmergencyContact, "id">;

const base = (vehicleId: string) => `/vehicles/${vehicleId}/emergency-contacts`;

export function useEmergencyContacts(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ["emergency-contacts", vehicleId ?? ""],
    enabled: !!vehicleId,
    queryFn: () => api<EmergencyContact[]>(base(vehicleId!)),
  });
}

export function useSaveEmergencyContact(vehicleId: string, id?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: EmergencyContactInput) =>
      id ? api<EmergencyContact>(`${base(vehicleId)}/${id}`, { method: "PATCH", body: input }) : api<EmergencyContact>(base(vehicleId), { body: input }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["emergency-contacts", vehicleId] });
    },
  });
}

export function useDeleteEmergencyContact(vehicleId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`${base(vehicleId)}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["emergency-contacts", vehicleId] });
    },
  });
}

export const telHref = (phone: string) => `tel:${phone.trim().startsWith("+") ? "+" : ""}${phone.replace(/\D/g, "")}`;
