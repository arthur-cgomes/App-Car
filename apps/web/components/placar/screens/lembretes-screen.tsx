"use client";

import { useReminders, useToggleReminder, type Reminder } from "@/lib/api/reminders";
import { useActiveVehicle } from "@/lib/api/vehicles";
import { cx } from "@/lib/cx";
import { reminderDetail, reminderUrgent, reminderWhen } from "@/lib/reminder-format";
import { useToday } from "@/lib/use-today";
import { InlineEmpty } from "../empty-state";
import { Footnote, Group, ROW_BODY } from "../grouped-list";
import { Icon } from "../icon";
import { LargeTitle } from "../large-title";
import { useShell } from "../shell/shell-context";

export function LembretesScreen() {
  const shell = useShell();
  const today = useToday();
  const { vehicle, isLoading: loadingVehicle } = useActiveVehicle();
  const { data, isLoading } = useReminders(vehicle?.id);
  const toggle = useToggleReminder();
  const pending = data?.items.filter((r) => !r.doneAt).length ?? 0;

  if (!loadingVehicle && !vehicle) {
    return (
      <div className="flex flex-col gap-4">
        <LargeTitle title="Lembretes" />
        <div className="mx-4">
          <InlineEmpty>Adicione um veículo para ver os lembretes.</InlineEmpty>
        </div>
      </div>
    );
  }

  const onToggle = (reminder: Reminder) =>
    vehicle && toggle.mutate({ vehicleId: vehicle.id, reminder }, { onError: () => shell.toast("Não foi possível atualizar o lembrete.") });

  return (
    <div className="flex flex-col gap-4">
      <LargeTitle title="Lembretes" subtitle={data ? `${pending} ${pending === 1 ? "pendente" : "pendentes"}` : ""} />

      {(isLoading || !today || !data) && <div className="mx-4 h-[220px] animate-pulse rounded-xl bg-ios-cell" />}

      {data && today && data.items.length === 0 && (
        <div className="mx-4">
          <InlineEmpty>Nenhum lembrete por enquanto. Toque em + para criar um.</InlineEmpty>
        </div>
      )}

      {data && today && data.items.length > 0 && (
        <Group className="mx-4">
          {data.items.map((reminder) => {
            const done = !!reminder.doneAt;
            const urgent = reminderUrgent(reminder, today, data.odometer);
            return (
              <div key={reminder.id} className="group/row flex items-center gap-1.5 pl-1.5">
                <button
                  type="button"
                  aria-label={done ? "Reabrir lembrete" : "Concluir lembrete"}
                  aria-pressed={done}
                  onClick={() => onToggle(reminder)}
                  className="grid size-11 flex-none cursor-pointer place-items-center border-0 bg-transparent active:scale-[.85]"
                >
                  <span
                    className="grid size-6 place-items-center rounded-full text-white transition-[background-color,box-shadow] duration-200"
                    style={{
                      boxShadow: `inset 0 0 0 1.5px ${done ? "var(--color-accent)" : "var(--ios-label3)"}`,
                      background: done ? "var(--color-accent)" : "transparent",
                    }}
                  >
                    <span className="transition-opacity duration-200" style={{ opacity: done ? 1 : 0 }}>
                      <Icon name="check" />
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={reminder.automatic}
                  onClick={() => shell.openReminderSheet(reminder)}
                  className={cx(
                    "flex min-w-0 flex-1 items-center gap-2.5 border-0 bg-transparent py-[11px] pr-4 text-left enabled:cursor-pointer enabled:active:opacity-60",
                    ROW_BODY,
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-base transition-colors duration-200" style={{ color: done ? "var(--ios-label2)" : "var(--ios-label)" }}>
                      {reminder.title}
                    </div>
                    <div className="text-[13px] text-ios-label2">{reminderDetail(reminder, data.odometer)}</div>
                  </div>
                  <span className="text-[13px] whitespace-nowrap" style={{ color: urgent ? "var(--ios-tint)" : "var(--ios-label2)" }}>
                    {reminderWhen(reminder, today, data.odometer, data.kmPerDay)}
                  </span>
                </button>
              </div>
            );
          })}
        </Group>
      )}

      <Footnote>Os lembretes ficam em destaque 15 dias antes de cada vencimento e 500 km antes de cada revisão.</Footnote>
    </div>
  );
}
