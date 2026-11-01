"use client";

import { EXPENSE_CATEGORY_BY_CODE } from "@monitoring-car/shared";
import { useRouter } from "next/navigation";
import { useSummary, type Summary } from "@/lib/api/summary";
import { useActiveVehicle, vehicleName, type Vehicle } from "@/lib/api/vehicles";
import { MONTHS_SHORT, brl, capitalize, km, monthName, previousMonth } from "@/lib/format";
import { reminderDetail, reminderUrgent, reminderWhen } from "@/lib/reminder-format";
import { useToday } from "@/lib/use-today";
import { LinkButton, PrimaryButton } from "../buttons";
import { CategoryIcon } from "../category-icon";
import { InlineEmpty } from "../empty-state";
import { ExpenseRow } from "../expense-row";
import { Group, ROW_BODY } from "../grouped-list";
import { Icon } from "../icon";
import { LargeTitle } from "../large-title";
import { PlateBadge } from "../plate";
import { useShell } from "../shell/shell-context";
import { TodayLabel } from "./today-label";

const CARD_KICKER = "text-[13px] font-semibold tracking-[.02em] text-ios-label2 uppercase";

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
          className="flex w-full cursor-pointer items-center gap-3.5 border-0 bg-transparent px-4 py-3.5 text-left active:bg-ios-fill"
        >
          <PlateBadge plate={vehicle.plate} />
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-semibold text-ios-label">{vehicleName(vehicle)}</div>
            <div className="text-[13px] text-ios-label2">
              {[vehicle.yearModel, vehicle.color, km(odometer)].filter(Boolean).join(" · ")}
            </div>
          </div>
          <span className="text-ios-label3">
            <Icon name="updown" />
          </span>
        </button>
        <button
          type="button"
          onClick={() => router.push(`/consulta?placa=${vehicle.plate}`)}
          className="flex h-11 w-full cursor-pointer items-center gap-2 border-0 border-t-[0.5px] border-ios-sep bg-transparent px-4 text-[15px] text-ios-tint active:bg-ios-fill"
        >
          <Icon name="search" />
          Consultar débitos desta placa
        </button>
        <button
          type="button"
          onClick={() => router.push("/veiculo")}
          className="flex h-11 w-full cursor-pointer items-center gap-2 border-0 border-t-[0.5px] border-ios-sep bg-transparent px-4 text-[15px] text-ios-tint active:bg-ios-fill"
        >
          <Icon name="card" />
          Ficha do veículo
        </button>
        <button
          type="button"
          onClick={() => router.push("/veiculo/contatos")}
          className="flex h-11 w-full cursor-pointer items-center gap-2 border-0 border-t-[0.5px] border-ios-sep bg-transparent px-4 text-[15px] text-ios-tint active:bg-ios-fill"
        >
          <Icon name="phone" />
          Contatos de emergência
        </button>
      </Group>

      {!summary ? <ResumoSkeleton withVehicle={false} /> : <SummaryCards summary={summary} today={today} />}
    </>
  );
}

function SummaryCards({ summary, today }: { summary: Summary; today: string }) {
  const router = useRouter();
  const shell = useShell();
  const { totalCents, categories, upcoming } = summary;
  const max = Math.max(...summary.months.map((m) => m.cents), 1);

  return (
    <>
      <div className="flex flex-col gap-3.5 rounded-2xl bg-ios-cell p-4">
        <div className={CARD_KICKER}>Gasto em {monthName(summary.month)}</div>
        <div className="font-rounded text-[44px] leading-none font-bold tracking-[-.02em] tabular-nums">{brl(totalCents)}</div>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13px] text-ios-label2">
          {summary.deltaPct !== null && (
            <span className="font-semibold text-ios-tint">
              {summary.deltaPct >= 0 ? "↑" : "↓"} {Math.abs(summary.deltaPct)}% vs {monthName(previousMonth(summary.month))}
            </span>
          )}
          <span>{brl(summary.costPerKmCents ?? 0)} por km</span>
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
            <div className="-mx-4 -mb-1.5 flex flex-col">
              {categories.map((segment) => (
                <div key={segment.code} className="flex min-h-11 items-center gap-3 px-4">
                  <CategoryIcon code={segment.code} />
                  <span className="flex-1 text-base">{EXPENSE_CATEGORY_BY_CODE[segment.code].name}</span>
                  <span className="text-base tabular-nums">{brl(segment.cents)}</span>
                  <span className="w-9 text-right text-[13px] text-ios-label2 tabular-nums">
                    {Math.round((segment.cents / totalCents) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <SectionTitle title="Próximos" onSeeAll={() => router.push("/lembretes")} />
        {upcoming.items.length === 0 ? (
          <InlineEmpty>Nenhum compromisso pendente.</InlineEmpty>
        ) : (
          <Group>
            {upcoming.items.map((reminder) => (
              <button
                key={reminder.id}
                type="button"
                onClick={() => router.push("/lembretes")}
                className="group/row flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent py-0 pr-0 pl-4 text-left active:bg-ios-fill"
              >
                <CategoryIcon code={reminder.category} />
                <div className={`flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-4 ${ROW_BODY}`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-base text-ios-label">{reminder.title}</div>
                    <div className="text-[13px] text-ios-label2">{reminderDetail(reminder, upcoming.odometer)}</div>
                  </div>
                  <span
                    className="text-sm whitespace-nowrap"
                    style={{ color: reminderUrgent(reminder, today, upcoming.odometer) ? "var(--ios-tint)" : "var(--ios-label2)" }}
                  >
                    {reminderWhen(reminder, today, upcoming.odometer, upcoming.kmPerDay)}
                  </span>
                </div>
              </button>
            ))}
          </Group>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-ios-cell p-4">
        <div className={CARD_KICKER}>Últimos 6 meses</div>
        <div className="grid h-[120px] grid-cols-6 items-end gap-3">
          {summary.months.map((bar) => (
            <div
              key={bar.month}
              className="rounded-[6px_6px_3px_3px] transition-[height] duration-400"
              style={{
                height: `${Math.max(4, (bar.cents / max) * 100)}%`,
                background: bar.month === summary.month ? "var(--color-accent)" : "var(--ios-bar)",
              }}
            />
          ))}
        </div>
        <div className="grid grid-cols-6 gap-3">
          {summary.months.map((bar) => (
            <span key={bar.month} className="text-center text-xs text-ios-label2">
              {capitalize(MONTHS_SHORT[+bar.month.slice(5) - 1])}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionTitle title="Recentes" onSeeAll={() => router.push("/gastos")} />
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
