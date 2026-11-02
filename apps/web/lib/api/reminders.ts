import type { ExpenseCategoryCode } from "@monitoring-car/shared";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "./client";

export interface Reminder {
  id: string;
  category: ExpenseCategoryCode;
  title: string;
  source: "MANUAL" | "AUTO_DEBT" | "AUTO_IPVA" | "AUTO_SERVICE" | "AUTO_OIL" | "AUTO_INSURANCE";
  automatic: boolean;
  dueDate: string | null;
  dueOdometer: number | null;
  amountCents: number | null;
  repeatMonths: number | null;
  repeatKm: number | null;
  doneAt: string | null;
}

export interface RemindersList {
  odometer: number;
  kmPerDay: number | null;
  items: Reminder[];
}

export interface ReminderInput {
  title: string;
  category: ExpenseCategoryCode;
  dueDate: string | null;
  dueOdometer: number | null;
  repeatMonths: number | null;
  repeatKm: number | null;
}

const key = (vehicleId: string) => ["reminders", vehicleId] as const;
const base = (vehicleId: string) => `/vehicles/${vehicleId}/reminders`;

export function useReminders(vehicleId: string | undefined) {
  return useQuery({
    queryKey: key(vehicleId ?? ""),
    enabled: !!vehicleId,
    queryFn: () => api<RemindersList>(base(vehicleId!)),
  });
}

function invalidate(client: QueryClient, vehicleId: string) {
  return Promise.all([
    client.invalidateQueries({ queryKey: key(vehicleId) }),
    client.invalidateQueries({ queryKey: ["expenses", vehicleId, "summary"] }),
  ]);
}

export function useToggleReminder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, reminder }: { vehicleId: string; reminder: Reminder }) =>
      api<Reminder>(`${base(vehicleId)}/${reminder.id}/${reminder.doneAt ? "undo" : "done"}`, { method: "POST" }),
    onMutate: ({ vehicleId, reminder }) =>
      client.setQueryData<RemindersList>(key(vehicleId), (list) =>
        list && {
          ...list,
          items: list.items.map((item) =>
            item.id === reminder.id ? { ...item, doneAt: item.doneAt ? null : new Date().toISOString() } : item,
          ),
        },
      ),
    onSettled: (_, __, { vehicleId }) => invalidate(client, vehicleId),
  });
}

export function useSaveReminder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, id, input }: { vehicleId: string; id?: string; input: ReminderInput }) =>
      id ? api<Reminder>(`${base(vehicleId)}/${id}`, { method: "PATCH", body: input }) : api<Reminder>(base(vehicleId), { body: input }),
    onSuccess: (_, { vehicleId }) => {
      void invalidate(client, vehicleId);
    },
  });
}

export function useDeleteReminder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, id }: { vehicleId: string; id: string }) => api<void>(`${base(vehicleId)}/${id}`, { method: "DELETE" }),
    onSuccess: (_, { vehicleId }) => {
      void invalidate(client, vehicleId);
    },
  });
}
