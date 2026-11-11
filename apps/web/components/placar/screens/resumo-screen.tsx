"use client";

import { EXPENSE_CATEGORY_BY_CODE } from "@monitoring-car/shared";
import { useRouter } from "next/navigation";
import { useSummary, type Summary } from "@/lib/api/summary";
import { useActiveVehicle, vehicleFullName, type Vehicle } from "@/lib/api/vehicles";
import { MONTHS_SHORT, brl, capitalize, km, monthName, previousMonth } from "@/lib/format";
import { useTires } from "@/lib/api/tires";
import { reminderDetail, reminderIcon, reminderOverdue, reminderUrgent, reminderWhen } from "@/lib/reminder-format";
import { attentionTitle, rotationStatus, tireStatus } from "@/lib/tire-status";
import { useToday } from "@/lib/use-today";
import { LinkButton, PrimaryButton } from "../buttons";
import { InlineEmpty } from "../empty-state";
import { ExpenseRow } from "../expense-row";
import { Group, ROW_BODY } from "../grouped-list";
import { Icon } from "../icon";
import { LargeTitle } from "../large-title";
import { PlateBadge } from "../plate";
import { useShell } from "../shell/shell-context";
import { TodayLabel } from "./today-label";
import { Masked } from "../masked";

function SectionTitle({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  return (
    <div className="flex items-baseline justify-between px-1">
      <div className="text-xl font-bold">{title}</div>
      <LinkButton onClick={onSeeAll} className="px-0 py-1">
        Ver todos
      </LinkButton>
    </div>
  );
}

function ResumoSkeleton({ withVehicle = true }: { withVehicle?: boolean }) {
  return (
    <>
      {withVehicle && <div className="h-[118px] animate-pulse rounded-2xl bg-ios-cell md:col-span-2" />}
      <div className="h-[260px] animate-pulse rounded-2xl bg-ios-cell" />
      <div className="h-[180px] animate-pulse rounded-2xl bg-ios-cell" />
    </>
  );
}

function NoVehicle() {
  const shell = useShell();
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-2xl bg-ios-cell px-4 py-[22px] text-center md:col-span-2">
      <PlateBadge plate="·······" />
      <div>
        <div className="text-[17px] font-semibold">Adicione seu carro</div>
        <div className="text-[15px] text-pretty text-ios-label2">
          Com a placa buscamos marca, modelo, ano e débitos automaticamente.
        </div>
      </div>
      <PrimaryButton onClick={shell.openVehicleSheet}>Adicionar veículo</PrimaryButton>
    </div>
  );
}

export function ResumoScreen() {
  const { vehicle, isLoading } = useActiveVehicle();
  const today = useToday();

  return (
    <div className="grid grid-cols-1 items-start gap-[22px] px-4 md:grid-cols-2 md:gap-x-4">
      <div className="md:col-span-2">
        <LargeTitle title="Resumo" subtitle={<TodayLabel />} inset={4} />
      </div>
      {isLoading || !today ? (
        <ResumoSkeleton />
      ) : vehicle ? (
        <VehicleSummary vehicle={vehicle} today={today} />
      ) : (
        <NoVehicle />
      )}
    </div>
  );
}

function VehicleSummary({ vehicle, today }: { vehicle: Vehicle; today: string }) {
  const router = useRouter();
  const shell = useShell();
  const month = today.slice(0, 7);
  const { data: summary } = useSummary(vehicle.id, month);
  const odometer = summary?.odometer ?? vehicle.currentOdometer;

  return (
    <>
      <Group className="rounded-2xl md:col-span-2">
        <button
          type="button"
          aria-label="Trocar veículo"
          onClick={shell.openVehiclePicker}
          className="flex w-full cursor-pointer items-center gap-4 border-0 bg-transparent p-[18px] text-left active:bg-ios-fill"
        >
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
            <PlateBadge plate={vehicle.plate} />
            <div className="text-[20px] font-bold text-ios-label">{vehicleFullName(vehicle)}</div>
            <div className="text-[15px] text-ios-label2">
              {[vehicle.yearModel, vehicle.color, km(odometer)].filter(Boolean).join(" · ")}
            </div>
          </div>
          <span className="text-ios-label3">
            <Icon name="updown" />
          </span>
        </button>
        <div className="flex border-t-[0.5px] border-ios-sep">
          <button
            type="button"
            onClick={() => router.push("/vehicle")}
            className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 border-0 bg-transparent text-[15px] font-medium text-ios-tint active:bg-ios-fill"
          >
            <Icon name="car" />
            Ficha do veículo
          </button>
          <button
            type="button"
            onClick={() => router.push("/vehicle/contacts")}
            className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 border-0 bg-transparent text-[15px] font-medium text-ios-tint active:bg-ios-fill"
          >
            <Icon name="asterisk" />
            Contatos
          </button>
        </div>
      </Group>

      {!summary ? <ResumoSkeleton withVehicle={false} /> : <SummaryCards summary={summary} today={today} vehicleId={vehicle.id} />}
    </>
  );
}

function TiresCard({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const today = useToday();
  const { data } = useTires(vehicleId);
  if (!data || !today || !data.tires.length) return null;
  const year = +today.slice(0, 4);
  const statuses = data.tires.map((tire) => tireStatus(tire, data, false, year));
  const rotation = rotationStatus(data);
  const color = (position: string) => statuses.find((status) => status.slot === position)?.color ?? "var(--ios-fill)";

  return (
    <button type="button" onClick={() => router.push("/tires")} className="flex w-full cursor-pointer items-center gap-[18px] rounded-2xl border-0 bg-ios-cell p-[18px] text-left text-ios-label active:opacity-70">
      <span aria-hidden className="relative grid flex-none grid-cols-[14px_14px] gap-x-[42px] gap-y-2 px-2.5 py-1">
        <span className="absolute top-[-2px] left-5 h-[76px] w-9 rounded-[14px] bg-ios-cell2" />
        {["DE", "DD", "TE", "TD"].map((position) => (
          <span key={position} className="relative h-[30px] w-3.5 rounded-[5px]" style={{ background: color(position) }} />
        ))}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[15px] font-semibold text-ios-label2">Pneus</span>
        <span className="text-[17px] font-semibold">{attentionTitle(statuses)}</span>
        <span className="text-[15px] text-ios-label2">Rodízio: {rotation.leftText}</span>
        <span className="mt-1 h-1.5 overflow-hidden rounded-[3px] bg-ios-fill">
          <span className="block h-full rounded-[3px]" style={{ width: `${rotation.percent}%`, background: rotation.color }} />
        </span>
      </span>
    </button>
  );
}

function SummaryCards({ summary, today, vehicleId }: { summary: Summary; today: string; vehicleId: string }) {
  const router = useRouter();
  const shell = useShell();
  const { totalCents, categories, upcoming } = summary;
  const max = Math.max(...summary.months.map((m) => m.cents), 1);

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl bg-ios-cell p-[18px]">
        <div className="flex items-baseline justify-between gap-3 text-[15px] text-ios-label2">
          <span className="font-semibold">Gasto de {monthName(summary.month)}</span>
          {summary.deltaPct !== null && (
            <span>
              {summary.deltaPct >= 0 ? "+" : "-"}
              {Math.abs(summary.deltaPct)}% vs. {monthName(previousMonth(summary.month))}
            </span>
          )}
        </div>
        <div className="font-rounded text-[44px] leading-none font-bold tracking-[-.02em] tabular-nums"><Masked text={brl(totalCents)} /></div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-ios-label2">
          <span><Masked text={brl(summary.costPerKmCents ?? 0)} /> por km</span>
          <span>{km(summary.kmDriven)} rodados</span>
        </div>
        {categories.length === 0 && (
          <div className="text-[15px] text-ios-label2">Nenhum gasto neste mês. Toque em + para lançar o primeiro.</div>
        )}
        {categories.length > 0 && (
          <>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-[5px]">
              {categories.map((segment) => (
                <div
                  key={segment.code}
                  style={{
                    width: `${(segment.cents / totalCents) * 100}%`,
                    background: `var(${EXPENSE_CATEGORY_BY_CODE[segment.code].colorToken})`,
                  }}
                />
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              {categories.map((segment) => (
                <div key={segment.code} className="flex items-center gap-2.5 text-[15px]">
                  <span className="size-2 flex-none rounded-full" style={{ background: `var(${EXPENSE_CATEGORY_BY_CODE[segment.code].colorToken})` }} />
                  <span className="flex-1">{EXPENSE_CATEGORY_BY_CODE[segment.code].name}</span>
                  <span className="text-ios-label2 tabular-nums"><Masked text={brl(segment.cents)} /></span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <TiresCard vehicleId={vehicleId} />

      <div className="flex flex-col gap-2">
        <SectionTitle title="Próximos" onSeeAll={() => router.push("/reminders")} />
        {upcoming.items.length === 0 ? (
          <InlineEmpty>Nenhum compromisso pendente.</InlineEmpty>
        ) : (
          <Group>
            {upcoming.items.map((reminder) => (
              <button
                key={reminder.id}
                type="button"
                onClick={() => router.push("/reminders")}
                className="group/row flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent py-0 pr-0 pl-4 text-left active:bg-ios-fill"
              >
                <span className="grid size-[34px] flex-none place-items-center rounded-[10px] bg-ios-fill text-ios-label">
                  <Icon name={reminderIcon(reminder)} />
                </span>
                <div className={`flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-4 ${ROW_BODY}`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-[17px] text-ios-label">{reminder.title}</div>
                    <div className="text-sm text-ios-label2"><Masked text={reminderDetail(reminder, upcoming.odometer)} /></div>
                  </div>
                  <span
                    className="text-sm whitespace-nowrap"
                    style={{ color: reminderOverdue(reminder, today, upcoming.odometer) ? "var(--danger)" : reminderUrgent(reminder, today, upcoming.odometer) ? "var(--ios-tint)" : "var(--ios-label2)" }}
                  >
                    {reminderWhen(reminder, today, upcoming.odometer, upcoming.kmPerDay)}
                  </span>
                </div>
              </button>
            ))}
          </Group>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="px-1 text-xl font-bold">Últimos 6 meses</div>
        <div className="flex h-[170px] items-end gap-3 rounded-2xl bg-ios-cell p-[18px] pb-3.5">
          {summary.months.map((bar) => (
            <div key={bar.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-[6px_6px_3px_3px] transition-[height] duration-400"
                  style={{
                    height: `${Math.max(4, (bar.cents / max) * 100)}%`,
                    background: bar.month === summary.month ? "var(--ios-tint)" : "var(--ios-bar)",
                  }}
                />
              </div>
              <span className="text-[13px] text-ios-label2">{capitalize(MONTHS_SHORT[+bar.month.slice(5) - 1])}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionTitle title="Recentes" onSeeAll={() => router.push("/expenses")} />
        {summary.recent.length === 0 ? (
          <InlineEmpty>Nenhum lançamento ainda.</InlineEmpty>
        ) : (
          <Group>
            {summary.recent.map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} onClick={() => shell.openExpenseDetail(expense.id)} />
            ))}
          </Group>
        )}
      </div>
    </>
  );
}
