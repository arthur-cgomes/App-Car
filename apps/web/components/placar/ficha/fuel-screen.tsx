"use client";

import { useFuelStats } from "@/lib/api/ficha";
import { useActiveVehicle } from "@/lib/api/vehicles";
import { brl, km } from "@/lib/format";
import { CategoryIcon } from "../category-icon";
import { InlineEmpty } from "../empty-state";
import { brDate } from "../form-cells";
import { Footnote, Group, ROW_BODY, Section, SectionHeader } from "../grouped-list";
import { PushPage } from "../push-page";
import { useShell } from "../shell/shell-context";
import { Masked } from "../masked";

const liters = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} L`;
const kml = (value: number) => `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km/l`;

export function FuelScreen() {
  const shell = useShell();
  const { vehicle } = useActiveVehicle();
  const { data, isLoading } = useFuelStats(vehicle?.id);

  return (
    <PushPage title="Abastecimentos" backHref="/vehicle">
      {isLoading && <div className="mx-4 h-[160px] animate-pulse rounded-2xl bg-ios-cell" />}
      {data && (
        <>
          <Section
            footer={
              <Footnote>
                {data.averageKmPerLiter
                  ? "Calculado entre abastecimentos com tanque cheio e odômetro."
                  : "Lance dois abastecimentos com tanque cheio, litros e odômetro para calcular o consumo."}
              </Footnote>
            }
          >
            <div className="mx-4 flex flex-col gap-3.5 rounded-2xl bg-ios-cell p-4">
              <div className="text-[13px] font-semibold tracking-[.02em] text-ios-label2 uppercase">Consumo médio</div>
              <div className="font-rounded text-[44px] leading-none font-bold tracking-[-.02em] tabular-nums">
                {data.averageKmPerLiter ? kml(data.averageKmPerLiter) : <span className="text-[22px] text-ios-label2">Sem dados ainda</span>}
              </div>
              <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13px] text-ios-label2">
                {data.averagePricePerLiterCents && <span><Masked text={brl(data.averagePricePerLiterCents)} /> por litro</span>}
                <span>{liters(data.totalLiters)} no total</span>
                <span><Masked text={brl(data.totalCents)} /></span>
              </div>
            </div>
          </Section>

          {data.fills.length === 0 ? (
            <div className="mx-4">
              <InlineEmpty>Nenhum abastecimento com litros. Ao lançar Combustível, informe os litros.</InlineEmpty>
            </div>
          ) : (
            <Section header={<SectionHeader>Histórico</SectionHeader>}>
              <Group className="mx-4">
                {data.fills.map((fill) => (
                  <button
                    key={fill.expenseId}
                    type="button"
                    onClick={() => shell.openExpenseDetail(fill.expenseId)}
                    className="group/row flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent py-0 pr-0 pl-4 text-left active:bg-ios-fill"
                  >
                    <CategoryIcon code="FUEL" />
                    <div className={`flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-4 ${ROW_BODY}`}>
                      <div className="min-w-0 flex-1">
                        <div className="text-base text-ios-label">
                          {liters(fill.liters)}
                          {fill.fullTank ? " · tanque cheio" : ""}
                        </div>
                        <div className="text-[13px] text-ios-label2">
                          <Masked text={[brDate(fill.date), fill.odometer && km(fill.odometer), `${brl(fill.pricePerLiterCents)}/L`].filter(Boolean).join(" · ")} />
                        </div>
                      </div>
                      <span className="text-sm whitespace-nowrap text-ios-tint">{fill.kmPerLiter ? kml(fill.kmPerLiter) : ""}</span>
                    </div>
                  </button>
                ))}
              </Group>
            </Section>
          )}
        </>
      )}
    </PushPage>
  );
}
