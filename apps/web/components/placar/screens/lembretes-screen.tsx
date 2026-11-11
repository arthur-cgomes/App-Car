"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useReminders, useToggleReminder, type Reminder } from "@/lib/api/reminders";
import { useActiveVehicle } from "@/lib/api/vehicles";
import { cx } from "@/lib/cx";
import { reminderDetail, reminderOverdue, reminderUrgent, reminderWhen } from "@/lib/reminder-format";
import { useToday } from "@/lib/use-today";
import { InlineEmpty } from "../empty-state";
import { Footnote, Group, ROW_BODY } from "../grouped-list";
import { Icon } from "../icon";
import { LargeTitle } from "../large-title";
import { SegmentedControl } from "../segmented-control";
import { useShell } from "../shell/shell-context";
import { Masked } from "../masked";

export function LembretesScreen() {
  const shell = useShell();
  const today = useToday();
  const { vehicle, isLoading: loadingVehicle } = useActiveVehicle();
  const { data, isLoading } = useReminders(vehicle?.id);
  const toggle = useToggleReminder();
  const router = useRouter();
  const filter = useSearchParams().get("filter") === "overdue" ? "overdue" : "all";
  const pending = data?.items.filter((r) => !r.doneAt).length ?? 0;
  const overdue = data && today ? data.items.filter((r) => reminderOverdue(r, today, data.odometer)) : [];
  const items = filter === "overdue" ? overdue : (data?.items ?? []);

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
    vehicle && toggle.mutate({ vehicleId: vehicle.id, reminder }, { onError: () => shell.alert("Não foi possível atualizar o lembrete.") });

  return (
    <div className="flex flex-col gap-4">
      <LargeTitle title="Lembretes" subtitle={data ? `${pending} ${pending === 1 ? "pendente" : "pendentes"}` : ""} />

      {(isLoading || !today || !data) && <div className="mx-4 h-[220px] animate-pulse rounded-xl bg-ios-cell" />}

      <div className="mx-4">
        <SegmentedControl
          options={[
            { value: "all", label: "Todos" },
            { value: "overdue", label: overdue.length ? `Vencidos (${overdue.length})` : "Vencidos" },
          ]}
          value={filter}
          onChange={(next) => router.replace(next === "overdue" ? "/reminders?filter=overdue" : "/reminders", { scroll: false })}
        />
      </div>

      {data && today && items.length === 0 && (
        <div className="mx-4">
          <InlineEmpty>
            {filter === "overdue" ? "Nenhum lembrete vencido. Tudo em dia!" : "Nenhum lembrete por enquanto. Toque em + para criar um."}
          </InlineEmpty>
        </div>
      )}

      {data && today && items.length > 0 && (
        <Group className="mx-4">
          {items.map((reminder) => {
            const done = !!reminder.doneAt;
            const urgent = reminderUrgent(reminder, today, data.odometer);
            const detail = reminderDetail(reminder, data.odometer);
            const when = reminderWhen(reminder, today, data.odometer, data.kmPerDay);
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
                      boxShadow: `inset 0 0 0 1.5px ${done ? "var(--ios-tint)" : "var(--ios-label3)"}`,
                      background: done ? "var(--ios-tint)" : "transparent",
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
                    <div className="text-[17px] transition-colors duration-200" style={{ color: done ? "var(--ios-label2)" : "var(--ios-label)" }}>
                      {reminder.title}
                    </div>
                    {detail && <div className="text-sm text-ios-label2"><Masked text={detail} /></div>}
                    {when && when !== detail && (
                      <div className="text-sm font-semibold" style={{ color: done ? "var(--ios-label2)" : reminderOverdue(reminder, today, data.odometer) ? "var(--danger)" : urgent ? "var(--ios-tint)" : "var(--ios-tint)" }}>
                        {when}
                      </div>
                    )}
                  </div>
                  {reminder.automatic && <span className="rounded-lg bg-ios-fill px-2 py-0.5 text-xs font-semibold text-ios-label2">Auto</span>}
                </button>
              </div>
            );
          })}
        </Group>
      )}

      <Footnote>Destaque 15 dias antes do vencimento e 500 km antes da revisão. Rodízio e calibragem são calculados a partir dos seus pneus.</Footnote>
    </div>
  );
}
