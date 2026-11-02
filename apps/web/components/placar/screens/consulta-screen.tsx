"use client";

import { formatPlate, isValidPlate } from "@monitoring-car/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { useMe } from "@/lib/api/auth";
import { plateApi, usePlateHistory, vehiclePlace, vehicleYears } from "@/lib/api/vehicles";
import { brl } from "@/lib/format";
import { PrimaryButton } from "../buttons";
import { EmptyState } from "../empty-state";
import { Footnote, Group, Section, SectionHeader, ValueRow } from "../grouped-list";
import { LargeTitle } from "../large-title";
import { PlateInput, cleanPlateInput } from "../plate";
import { useShell } from "../shell/shell-context";

export function ConsultaScreen() {
  const shell = useShell();
  const queryClient = useQueryClient();
  const me = useMe();
  const history = usePlateHistory();
  const searchParams = useSearchParams();
  const [initialPlate] = useState(() => cleanPlateInput(searchParams.get("plate") ?? ""));
  const [plate, setPlate] = useState(initialPlate);
  const [submitted, setSubmitted] = useState(isValidPlate(initialPlate) ? initialPlate : null);
  const [inputError, setInputError] = useState("");

  const consultation = useQuery({
    queryKey: ["plates", submitted, "lookup"],
    enabled: !!submitted && me.data?.plateLookupAvailable !== false,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const response = await plateApi.consult(submitted!);
      queryClient.invalidateQueries({ queryKey: ["plates", "history"] });
      return response;
    },
  });
  const busy = consultation.isFetching;
  const result = busy ? null : (consultation.data ?? null);
  const error = inputError || (consultation.error && !busy ? errorMessage(consultation.error) : "");

  const run = (target: string) => {
    if (!isValidPlate(target)) {
      setInputError("Placa inválida. Use ABC1D23 ou ABC1234.");
      setSubmitted(null);
      return;
    }
    setPlate(target);
    setInputError("");
    if (target === submitted) consultation.refetch();
    else setSubmitted(target);
  };

  const openDebts = result?.debts.filter((d) => d.status === "OPEN") ?? [];

  if (me.data && !me.data.plateLookupAvailable) {
    return (
      <div className="flex flex-col gap-[18px]">
        <LargeTitle title="Consulta" subtitle="Dados do veículo, IPVA, licenciamento e multas." />
        <EmptyState
          icon="search"
          title="Consulta em breve"
          description="A consulta de débitos e dados pela placa ainda não está disponível. Enquanto isso, lance IPVA, licenciamento e multas em Gastos e acompanhe os vencimentos em Lembretes."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <LargeTitle title="Consulta" subtitle="Dados do veículo, IPVA, licenciamento e multas." />

      <div className="mx-4 flex flex-col items-center gap-3.5 rounded-2xl bg-ios-cell px-4 py-[18px]">
        <PlateInput
          value={plate}
          onChange={(value) => {
            setPlate(value);
            setInputError("");
          }}
        />
        <PrimaryButton onClick={() => run(plate)}>{busy ? "Consultando…" : "Consultar"}</PrimaryButton>
        {error && (
          <div role="alert" className="text-center text-sm text-danger">
            {error}
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2 empty:hidden">
          {(history.data ?? []).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => run(p)}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-2xl border-0 bg-ios-bg px-3 text-ios-label active:opacity-60"
              style={{ font: "600 16px/1 var(--font-barlow-condensed)", letterSpacing: ".06em" }}
            >
              {formatPlate(p)}
            </button>
          ))}
        </div>
      </div>

      {busy && (
        <div className="mx-4 flex flex-col gap-1 px-4 py-6 text-center">
          <div className="text-[17px] font-semibold">Consultando…</div>
          <div className="text-sm text-ios-label2">DETRAN, SEFAZ e órgãos autuadores</div>
        </div>
      )}

      {result && (
        <>
          <Section header={<SectionHeader>Veículo</SectionHeader>}>
            <Group className="mx-4 text-base">
              <div className="border-b-[0.5px] border-ios-sep px-4 py-3">
                <div className="text-[17px] font-semibold">
                  {result.vehicle.brand} {result.vehicle.model}
                </div>
                <div className="text-[13px] text-ios-tint">
                  {formatPlate(result.plate)} · {result.vehicle.restrictions}
                </div>
              </div>
              <ValueRow label="Ano" value={vehicleYears(result.vehicle)} />
              <ValueRow label="Cor" value={result.vehicle.color} />
              <ValueRow label="Combustível" value={result.vehicle.fuelType} />
              <ValueRow label="Município" value={vehiclePlace(result.vehicle)} />
            </Group>
          </Section>

          {result.debts.length > 0 && (
            <Section header={<SectionHeader>Débitos</SectionHeader>}>
              <Group className="mx-4 text-base">
                {result.debts.map((debt) => {
                  const paid = debt.status === "PAID";
                  return (
                    <div key={debt.description} className="flex items-center gap-2.5 border-b-[0.5px] border-ios-sep px-4 py-[11px] last:border-transparent">
                      <span className="flex-1">{debt.description}</span>
                      <span className="tabular-nums">{brl(debt.amountCents)}</span>
                      <span
                        className="rounded-md px-2 py-[3px] text-xs font-semibold"
                        style={{ background: paid ? "var(--ios-fill)" : "var(--ios-tintbg)", color: paid ? "var(--ios-label2)" : "var(--ios-tint)" }}
                      >
                        {paid ? "Pago" : "Em aberto"}
                      </span>
                    </div>
                  );
                })}
              </Group>
            </Section>
          )}

          {result.openCents > 0 ? (
            <div className="mx-4 flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between px-4">
                <span className="text-[15px] text-ios-label2">Total em aberto</span>
                <span className="font-rounded text-[26px] font-bold tabular-nums">{brl(result.openCents)}</span>
              </div>
              <PrimaryButton
                onClick={() =>
                  shell.openExpenseSheet({
                    category: "FINES",
                    amount: (result.openCents / 100).toFixed(2).replace(".", ","),
                    description: openDebts.length === 1 ? openDebts[0].description : `Débitos da placa ${formatPlate(result.plate)}`,
                  })
                }
              >
                Lançar como gasto
              </PrimaryButton>
            </div>
          ) : (
            <div className="px-8 text-[15px] text-ios-tint">Nenhum débito em aberto.</div>
          )}
          <Footnote>Dados de parceiros autorizados. Confirme valores no DETRAN do seu estado.</Footnote>
        </>
      )}
    </div>
  );
}
