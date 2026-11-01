"use client";

import { useState } from "react";
import { reportDownloadUrl, useReport } from "@/lib/api/ficha";
import { useActiveVehicle } from "@/lib/api/vehicles";
import { MONTHS_SHORT, brl, capitalize } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { Chip } from "../chip";
import { InlineEmpty } from "../empty-state";
import { brDate } from "../form-cells";
import { Footnote, Group, Section, SectionHeader, ValueRow } from "../grouped-list";
import { Icon } from "../icon";
import { PushPage } from "../push-page";

type Period = "month" | "3m" | "year" | "12m";

const PERIODS: { value: Period; label: string }[] = [
  { value: "month", label: "Este mês" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "year", label: "Este ano" },
  { value: "12m", label: "Últimos 12 meses" },
];

function monthsBack(today: string, n: number) {
  const [year, month] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 - n, 1));
  return date.toISOString().slice(0, 10);
}

function range(period: Period, today: string) {
  if (period === "month") return { from: `${today.slice(0, 7)}-01`, to: today };
  if (period === "3m") return { from: monthsBack(today, 2), to: today };
  if (period === "year") return { from: `${today.slice(0, 4)}-01-01`, to: today };
  return { from: monthsBack(today, 11), to: today };
}

export function ReportsScreen() {
  const today = useToday();
  const { vehicle } = useActiveVehicle();
  const [period, setPeriod] = useState<Period>("year");
  const { from, to } = today ? range(period, today) : { from: null, to: null };
  const { data, isLoading } = useReport(vehicle?.id, from, to);

  return (
    <PushPage title="Relatórios" backHref="/veiculo">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-0.5">
        {PERIODS.map((option) => (
          <Chip key={option.value} active={period === option.value} onClick={() => setPeriod(option.value)}>
            {option.label}
          </Chip>
        ))}
      </div>

      {isLoading && <div className="mx-4 h-[200px] animate-pulse rounded-2xl bg-ios-cell" />}

      {data && (
        <>
          <div className="mx-4 flex flex-col gap-1.5 rounded-2xl bg-ios-cell p-4">
            <div className="text-[13px] font-semibold tracking-[.02em] text-ios-label2 uppercase">
              {brDate(data.from)} a {brDate(data.to)}
            </div>
            <div className="font-rounded text-[44px] leading-none font-bold tracking-[-.02em] tabular-nums">{brl(data.totalCents)}</div>
            <div className="text-[13px] text-ios-label2">
              {data.count} {data.count === 1 ? "lançamento" : "lançamentos"}
            </div>
          </div>

          {data.count === 0 ? (
            <div className="mx-4">
              <InlineEmpty>Nenhum gasto neste período.</InlineEmpty>
            </div>
          ) : (
            <>
              <Section header={<SectionHeader>Por categoria</SectionHeader>}>
                <Group className="mx-4">
                  {data.byCategory.map((item) => (
                    <ValueRow key={item.code} label={`${item.name} (${item.count})`} value={brl(item.cents)} />
                  ))}
                </Group>
              </Section>
              {(data.costs.partsCents > 0 || data.costs.laborCents > 0 || data.costs.maintenanceUnsplitCents > 0) && (
                <Section
                  header={<SectionHeader>Peças e mão de obra</SectionHeader>}
                  footer={<Footnote>Peças somam a categoria Peças e as peças informadas nas manutenções.</Footnote>}
                >
                  <Group className="mx-4">
                    <ValueRow label="Peças" value={brl(data.costs.partsCents)} />
                    <ValueRow label="Mão de obra" value={brl(data.costs.laborCents)} />
                    {data.costs.maintenanceUnsplitCents > 0 && <ValueRow label="Manutenção sem detalhar" value={brl(data.costs.maintenanceUnsplitCents)} />}
                  </Group>
                </Section>
              )}
              {data.byPartSystem.length > 0 && (
                <Section header={<SectionHeader>Peças e manutenção por sistema</SectionHeader>}>
                  <Group className="mx-4">
                    {data.byPartSystem.map((item) => (
                      <ValueRow key={item.code} label={item.name} value={brl(item.cents)} />
                    ))}
                  </Group>
                </Section>
              )}
              <Section header={<SectionHeader>Por mês</SectionHeader>}>
                <Group className="mx-4">
                  {data.byMonth.map((item) => (
                    <ValueRow key={item.month} label={`${capitalize(MONTHS_SHORT[+item.month.slice(5) - 1])}/${item.month.slice(0, 4)}`} value={brl(item.cents)} />
                  ))}
                </Group>
              </Section>
            </>
          )}

          {vehicle && from && to && (
            <Section header={<SectionHeader>Exportar</SectionHeader>}>
              <Group className="mx-4">
                {(["csv", "pdf"] as const).map((format) => (
                  <a
                    key={format}
                    href={reportDownloadUrl(vehicle.id, from, to, format)}
                    download
                    className="flex min-h-[46px] items-center gap-3 border-b-[0.5px] border-ios-sep px-4 text-[17px] text-ios-tint no-underline last:border-b-0 active:bg-ios-fill"
                  >
                    <Icon name="download" />
                    {format === "csv" ? "Planilha (CSV para Excel)" : "PDF"}
                  </a>
                ))}
              </Group>
            </Section>
          )}
        </>
      )}
    </PushPage>
  );
}
