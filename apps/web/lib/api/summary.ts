import type { ExpenseCategoryCode } from "@monitoring-car/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { Expense } from "./expenses";
import type { RemindersList } from "./reminders";

export interface Summary {
  month: string;
  totalCents: number;
  previousCents: number;
  deltaPct: number | null;
  kmDriven: number;
  costPerKmCents: number | null;
  odometer: number;
  categories: { code: ExpenseCategoryCode; cents: number }[];
  months: { month: string; cents: number }[];
  recent: Expense[];
  upcoming: RemindersList;
}

export function useSummary(vehicleId: string | undefined, month: string | null) {
  return useQuery({
    queryKey: ["expenses", vehicleId ?? "", "summary", month],
    enabled: !!vehicleId && !!month,
    queryFn: () => api<Summary>(`/vehicles/${vehicleId}/summary?month=${month}`),
  });
}
