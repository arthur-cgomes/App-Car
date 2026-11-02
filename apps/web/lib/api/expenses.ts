import type { ExpenseCategoryCode, PartSystemCode } from "@monitoring-car/shared";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { prepareImage } from "@/lib/image";
import { api } from "./client";

export interface Expense {
  id: string;
  vehicleId: string;
  category: ExpenseCategoryCode;
  partSystem: PartSystemCode | null;
  description: string;
  amountCents: number;
  date: string;
  odometer: number | null;
  occurredAt: string | null;
  establishment: string | null;
  partsCents: number | null;
  laborCents: number | null;
  source: "MANUAL" | "DEBT" | "INSURANCE" | "DOCUMENT" | "API";
  attachments: { id: string }[];
  fuel: { liters: number; fullTank: boolean } | null;
  createdAt: string;
}

export interface ExpenseInput {
  category: ExpenseCategoryCode;
  partSystem: PartSystemCode | null;
  description: string | null;
  amountCents: number;
  date: string;
  odometer: number | null;
  establishment: string | null;
  partsCents: number | null;
  laborCents: number | null;
  attachmentIds: string[];
  fuel: { liters: number; fullTank: boolean } | null;
}

export interface ExpenseMonth {
  month: string;
  count: number;
  totalCents: number;
}

type ListParams = { month: string } | { from: string };

const keys = {
  all: (vehicleId: string) => ["expenses", vehicleId] as const,
  list: (vehicleId: string, params: ListParams) => ["expenses", vehicleId, "list", params] as const,
  months: (vehicleId: string) => ["expenses", vehicleId, "months"] as const,
  one: (vehicleId: string, id: string) => ["expenses", vehicleId, "one", id] as const,
};

const base = (vehicleId: string) => `/vehicles/${vehicleId}/expenses`;

export const fileUrl = (id: string) => `/api/v1/files/${id}`;

export async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  if (file.type.startsWith("image/")) form.append("file", await prepareImage(file), file.name.replace(/\.\w+$/, "") + ".jpg");
  else form.append("file", file, file.name);
  return (await api<{ id: string }>("/files", { body: form })).id;
}

export function useExpenses(vehicleId: string | undefined, params: ListParams) {
  return useQuery({
    queryKey: keys.list(vehicleId ?? "", params),
    enabled: !!vehicleId,
    queryFn: () => api<Expense[]>(`${base(vehicleId!)}?${new URLSearchParams(params)}`),
  });
}

export function useExpenseMonths(vehicleId: string | undefined) {
  return useQuery({
    queryKey: keys.months(vehicleId ?? ""),
    enabled: !!vehicleId,
    queryFn: () => api<ExpenseMonth[]>(`${base(vehicleId!)}/months`),
  });
}

function cachedExpense(client: QueryClient, vehicleId: string, id: string) {
  for (const [, list] of client.getQueriesData<Expense[]>({ queryKey: [...keys.all(vehicleId), "list"] })) {
    const found = list?.find((expense) => expense.id === id);
    if (found) return found;
  }
  return undefined;
}

export function useExpense(vehicleId: string | undefined, id: string | null) {
  const client = useQueryClient();
  return useQuery({
    queryKey: keys.one(vehicleId ?? "", id ?? ""),
    enabled: !!vehicleId && !!id,
    queryFn: () => api<Expense>(`${base(vehicleId!)}/${id}`),
    placeholderData: () => (vehicleId && id ? cachedExpense(client, vehicleId, id) : undefined),
  });
}

function invalidate(client: QueryClient, vehicleId: string) {
  return Promise.all([
    client.invalidateQueries({ queryKey: keys.all(vehicleId) }),
    client.invalidateQueries({ queryKey: ["vehicles"] }),
    client.invalidateQueries({ queryKey: ["reminders", vehicleId] }),
  ]);
}

export function useSaveExpense() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, id, input }: { vehicleId: string; id?: string; input: Partial<ExpenseInput> }) =>
      id
        ? api<Expense>(`${base(vehicleId)}/${id}`, { method: "PATCH", body: input })
        : api<Expense>(base(vehicleId), { body: input }),
    onSuccess: (_, { vehicleId }) => {
      void invalidate(client, vehicleId);
    },
  });
}

export function useDeleteExpense() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, id }: { vehicleId: string; id: string }) => api<void>(`${base(vehicleId)}/${id}`, { method: "DELETE" }),
    onSuccess: (_, { vehicleId }) => {
      void invalidate(client, vehicleId);
    },
  });
}
