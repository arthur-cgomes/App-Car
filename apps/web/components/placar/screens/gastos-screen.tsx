"use client";

import { EXPENSE_CATEGORIES, PART_SYSTEM_BY_CODE, type ExpenseCategoryCode, type PartSystemCode } from "@monitoring-car/shared";
import { useState } from "react";
import { useExpenseMonths, useExpenses } from "@/lib/api/expenses";
import { useActiveVehicle } from "@/lib/api/vehicles";
import { expensesForList, monthsForNavigation } from "@/lib/expense-selectors";
import { brl, monthLabel } from "@/lib/format";
import { cx } from "@/lib/cx";
import { useToday } from "@/lib/use-today";
import { LinkButton } from "../buttons";
import { Chip } from "../chip";
import { EmptyState } from "../empty-state";
import { ExpenseRow } from "../expense-row";
import { Group, SectionHeader } from "../grouped-list";
import { Icon } from "../icon";
import { LargeTitle } from "../large-title";
import { useShell } from "../shell/shell-context";
import { Masked } from "../masked";

function MonthArrow({ direction, enabled, onClick }: { direction: "left" | "right"; enabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={direction === "left" ? "Mês anterior" : "Próximo mês"}
      onClick={() => enabled && onClick()}
      className="grid size-11 cursor-pointer place-items-center border-0 bg-transparent active:opacity-50"
      style={{ color: enabled ? "var(--ios-tint)" : "var(--ios-label3)" }}
    >
      <Icon name={direction} />
    </button>
  );
}

export function GastosScreen() {
  const today = useToday();
  const { vehicle, isLoading } = useActiveVehicle();
  if (!today || isLoading) return <LargeTitle title="Gastos" />;
  return <GastosList key={vehicle?.id} vehicleId={vehicle?.id} vehicleLabel={vehicle ? `${vehicle.brand === "Volkswagen" ? "VW" : vehicle.brand} ${vehicle.model} · ${vehicle.plate}` : ""} currentMonth={today.slice(0, 7)} />;
}

function GastosList({ vehicleId, vehicleLabel, currentMonth }: { vehicleId: string | undefined; vehicleLabel: string; currentMonth: string }) {
  const shell = useShell();
  const [month, setMonth] = useState(currentMonth);
  const { data: expenses = [], isLoading } = useExpenses(vehicleId, { month });
  const { data: monthSummaries = [] } = useExpenseMonths(vehicleId);
  const [category, setCategory] = useState<ExpenseCategoryCode | "ALL">("ALL");
  const [partSystem, setPartSystem] = useState<PartSystemCode | null>(null);

  const months = monthsForNavigation(monthSummaries.map((m) => m.month), currentMonth);
  const index = months.indexOf(month);
  const view = expensesForList(expenses, month, category, partSystem);
  const count = view.list.length;

  return (
    <div className="flex flex-col gap-4">
      <LargeTitle title="Gastos" subtitle={vehicleLabel} />

      <div className="mx-4 flex items-center rounded-[22px] bg-ios-cell p-1">
        <MonthArrow direction="left" enabled={index > 0} onClick={() => setMonth(months[index - 1])} />
        <div className="flex-1 text-center">
          <div className="text-[17px] font-semibold">{monthLabel(month)}</div>
          <div className="text-[13px] text-ios-label2 tabular-nums">
            {count} {count === 1 ? "lançamento" : "lançamentos"} · <Masked text={brl(view.total)} />
          </div>
        </div>
        <MonthArrow direction="right" enabled={index < months.length - 1} onClick={() => setMonth(months[index + 1])} />
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-0.5">
        {[{ code: "ALL" as const, name: "Todas" }, ...EXPENSE_CATEGORIES].map((c) => (
          <Chip
            key={c.code}
            active={category === c.code}
            onClick={() => {
              setCategory(c.code);
              setPartSystem(null);
            }}
          >
            {c.name}
          </Chip>
        ))}
      </div>

      {view.partSummary.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <SectionHeader trailing={<Masked text={brl(view.partsTotal)} />}>Peças por sistema</SectionHeader>
          <Group className="mx-4">
            {view.partSummary.map((part) => {
              const on = partSystem === part.code;
              return (
                <button
                  key={part.code}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPartSystem(on ? null : part.code)}
                  className="flex w-full cursor-pointer flex-col gap-1.5 border-0 border-b-[0.5px] border-ios-sep bg-transparent px-4 py-2.5 text-left text-ios-label last:border-transparent active:bg-ios-fill"
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="-ml-1 text-ios-tint" style={{ opacity: on ? 1 : 0 }}>
                      <Icon name="check" size={18} />
                    </span>
                    <span className={cx("flex-1 text-base", on && "font-semibold")}>{part.name}</span>
                    <span className="text-base tabular-nums"><Masked text={brl(part.cents)} /></span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-sm bg-ios-fill">
                    <div className="h-full rounded-sm bg-accent" style={{ width: `${part.width}%` }} />
                  </div>
                </button>
              );
            })}
          </Group>
          {partSystem && (
            <LinkButton onClick={() => setPartSystem(null)} className="mx-8 self-start px-0 py-0.5 text-sm">
              Mostrando só {PART_SYSTEM_BY_CODE[partSystem].name} · Limpar
            </LinkButton>
          )}
        </div>
      )}

      {isLoading && <div className="mx-4 h-[140px] animate-pulse rounded-xl bg-ios-cell" />}

      {count === 0 && !isLoading && (
        <EmptyState
          icon="receipt"
          title="Nenhum gasto"
          description="Não há lançamentos neste mês para o filtro escolhido."
          action={
            <LinkButton onClick={() => shell.openExpenseSheet()} className="mt-1.5 text-[17px]">
              Adicionar gasto
            </LinkButton>
          }
        />
      )}

      {view.groups.length > 0 && (
        <Group className="mx-4">
          {view.groups.flatMap((group) => group.items).map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} onClick={() => shell.openExpenseDetail(expense.id)} />
          ))}
        </Group>
      )}
    </div>
  );
}
