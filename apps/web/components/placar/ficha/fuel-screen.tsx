"use client";

import type { ReactNode } from "react";
import { useFuelStats } from "@/lib/api/ficha";
import { useActiveVehicle } from "@/lib/api/vehicles";
import { brl, km } from "@/lib/format";
import { InlineEmpty } from "../empty-state";
import { brDate } from "../form-cells";
import { Footnote, Group, ROW_BODY, Section } from "../grouped-list";
import { PushPage } from "../push-page";
import { useShell } from "../shell/shell-context";
import { Masked } from "../masked";

const liters = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} L`;
const kml = (value: number) => `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km/l`;

const number = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Tile({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[22px] bg-ios-cell p-3.5">
      <span className="text-[15px] text-ios-label2">{label}</span>
      <span className="font-rounded text-[24px] font-bold tabular-nums">
        {value} {unit && <span className="text-[15px] font-normal text-ios-label2">{unit}</span>}
      </span>
    </div>
  );
}

export function FuelScreen() {
  const shell = useShell();
  const { vehicle } = useActiveVehicle();
  const { data, isLoading } = useFuelStats(vehicle?.id);

  return (
    <PushPage title="Abastecimentos" large backHref="/vehicle">
      {isLoading && <div className="mx-4 h-[160px] animate-pulse rounded-2xl bg-ios-cell" />}
      {data && (
        <>
          <div className="mx-4 grid grid-cols-2 gap-2.5">
            <Tile label="Consumo médio" value={data.averageKmPerLiter ? number(data.averageKmPerLiter) : "–"} unit="km/l" />
            <Tile label="Preço médio" value={data.averagePricePerLiterCents ? <Masked text={brl(data.averagePricePerLiterCents)} /> : "–"} />
            <Tile label="Litros" value={data.totalLiters.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} />
            <Tile label="Total" value={<Masked text={brl(data.totalCents)} />} />
          </div>

          {data.fills.length === 0 ? (
            <div className="mx-4">
              <InlineEmpty>Nenhum abastecimento com litros. Ao lançar Combustível, informe os litros.</InlineEmpty>
            </div>
          ) : (
            <Section footer={<Footnote>O consumo usa dois tanques cheios seguidos.</Footnote>}>
              <Group className="mx-4">
                {data.fills.map((fill) => (
                  <button
                    key={fill.expenseId}
                    type="button"
                    onClick={() => shell.openExpenseDetail(fill.expenseId)}
                    className="group/row flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent py-0 pr-0 pl-4 text-left active:bg-ios-fill"
                  >
                    <div className={`flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-4 ${ROW_BODY}`}>
                      <div className="min-w-0 flex-1">
                        <div className="text-[17px] text-ios-label">
                          {liters(fill.liters)}
                          {fill.fullTank ? " · tanque cheio" : ""}
                        </div>
                        <div className="text-sm text-ios-label2">
                          <Masked text={[brDate(fill.date), fill.odometer && km(fill.odometer)].filter(Boolean).join(" · ")} />
                        </div>
                      </div>
                      <span className="text-[15px] font-medium whitespace-nowrap">{fill.kmPerLiter ? kml(fill.kmPerLiter) : "–"}</span>
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
