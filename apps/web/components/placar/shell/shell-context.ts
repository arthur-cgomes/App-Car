"use client";

import { createContext, useContext } from "react";
import type { Reminder } from "@/lib/api/reminders";
import type { ExpenseFormValues } from "../sheets/expense-sheet";

export interface ConfirmAction {
  message: string;
  label: string;
  onConfirm: () => void;
}

export interface ShellApi {
  openExpenseSheet: (prefill?: Partial<ExpenseFormValues>) => void;
  openVehicleSheet: () => void;
  openReminderSheet: (reminder?: Reminder) => void;
  openVehiclePicker: () => void;
  openExpenseDetail: (id: string) => void;
  confirm: (action: ConfirmAction) => void;
  toast: (message: string) => void;
}

export const ShellContext = createContext<ShellApi | null>(null);

export function useShell() {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error("useShell precisa estar dentro de AppShell");
  return shell;
}
