"use client";

import { formatPlate } from "@monitoring-car/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { fichaApi, useFipe } from "@/lib/api/ficha";
import { useActiveVehicle, vehicleName, vehiclePlace, vehicleYears } from "@/lib/api/vehicles";
import { MONTHS_LONG, brl, km } from "@/lib/format";
import { Chip } from "../chip";
import { InlineEmpty } from "../empty-state";
import { brDate } from "../form-cells";
import { Footnote, Group, Section, SectionHeader, ValueRow } from "../grouped-list";
import { PlateBadge } from "../plate";
import { PushPage } from "../push-page";
import { useShell } from "../shell/shell-context";
import { NavRow } from "./nav-row";

const INTERVALS = [5000, 10000, 15000, 20000];

export function FichaScreen() {
  const router = useRouter();
  const shell = useShell();
  const client = useQueryClient();
  const { vehicle, isLoading } = useActiveVehicle();
  const fipe = useFipe(vehicle?.id);
  const [interval, setInterval] = useState<number | null>(null);

  if (isLoading) return <PushPage title="Ficha do veículo" backHref="/">{null}</PushPage>;
  if (!vehicle) {
    return (
      <PushPage title="Ficha do veículo" backHref="/">
        <div className="mx-4">
          <InlineEmpty>Adicione um veículo para ver a ficha.</InlineEmpty>
        </div>
      </PushPage>
    );
  }

  const currentInterval = interval ?? vehicle.serviceIntervalKm;
  const changeInterval = async (value: number) => {
    setInterval(value);
    try {
      await fichaApi.updateVehicle(vehicle.id, { serviceIntervalKm: value });
      await Promise.all([client.invalidateQueries({ queryKey: ["vehicles"] }), client.invalidateQueries({ queryKey: ["reminders", vehicle.id] })]);
    } catch (error) {
      setInterval(null);
      shell.toast(errorMessage(error));
    }
  };

  const remove = () =>
    shell.confirm({
      message: `Remover ${vehicleName(vehicle)} (${formatPlate(vehicle.plate)})? Os gastos e lembretes deixam de aparecer na sua conta.`,
      label: "Remover veículo",
      onConfirm: async () => {
        try {
          await fichaApi.deleteVehicle(vehicle.id);
          await Promise.all([client.invalidateQueries({ queryKey: ["vehicles"] }), client.invalidateQueries({ queryKey: ["me"] })]);
          router.push("/");
          shell.toast("Veículo removido.");
        } catch (error) {
          shell.toast(errorMessage(error));
        }
      },
    });

  const reference = fipe.data?.available ? fipe.data.referenceMonth : null;

  return (
    <PushPage title="Ficha do veículo" backHref="/">
      <div className="flex flex-col items-center gap-2.5 px-6 pt-2 text-center">
        <PlateBadge plate={vehicle.plate} />
        <div className="text-[22px] font-bold">{vehicleName(vehicle)}</div>
        <div className="-mt-1.5 text-[15px] text-ios-label2">{[vehicleYears(vehicle), vehicle.color].filter(Boolean).join(" · ")}</div>
      </div>

      <Section
        header={<SectionHeader>Valor de mercado</SectionHeader>}
        footer={
          <Footnote>
            {reference
              ? `Tabela FIPE de ${MONTHS_LONG[+reference.slice(5) - 1]} de ${reference.slice(0, 4)}.`
              : fipe.isLoading
                ? "Consultando a tabela FIPE…"
                : "Valor FIPE indisponível para este veículo."}
          </Footnote>
        }
      >
        <Group className="mx-4">
          <div className="flex items-baseline justify-between px-4 py-3">
            <span className="text-[17px]">FIPE</span>
            <span className="font-rounded text-[26px] font-bold tabular-nums">{fipe.data?.available ? brl(fipe.data.valueCents) : "—"}</span>
          </div>
        </Group>
      </Section>

      <Section header={<SectionHeader>Dados do veículo</SectionHeader>}>
        <Group className="mx-4">
          {vehicle.modelVersion && <ValueRow label="Versão" value={vehicle.modelVersion} />}
          <ValueRow label="Odômetro" value={km(vehicle.currentOdometer)} />
          {vehicle.purchaseDate && <ValueRow label="Data da compra" value={brDate(vehicle.purchaseDate)} />}
          {vehicle.fuelType && <ValueRow label="Combustível" value={vehicle.fuelType} />}
          {vehiclePlace(vehicle) && <ValueRow label="Município" value={vehiclePlace(vehicle)} />}
          {vehicle.restrictions && <ValueRow label="Situação" value={vehicle.restrictions} />}
        </Group>
      </Section>

      <Section header={<SectionHeader>Revisão a cada</SectionHeader>} footer={<Footnote>Usado no lembrete automático da próxima revisão.</Footnote>}>
        <div className="mx-4 flex flex-wrap gap-2">
          {INTERVALS.map((value) => (
            <Chip key={value} size="sm" active={currentInterval === value} onClick={() => changeInterval(value)}>
              {km(value)}
            </Chip>
          ))}
        </div>
      </Section>

      <Group className="mx-4">
        <NavRow href="/veiculo/documentos" icon="file-text" title="Documentos" />
        <NavRow href="/veiculo/seguros" icon="shield" title="Seguros" />
        <NavRow href="/veiculo/contatos" icon="phone" title="Contatos de emergência" />
        <NavRow href="/veiculo/abastecimentos" icon="fuel" title="Abastecimentos" />
        <NavRow href="/veiculo/relatorios" icon="chart" title="Relatórios" />
      </Group>

      <Group className="mx-4">
        <button type="button" onClick={remove} className="h-[46px] w-full cursor-pointer border-0 bg-transparent text-base text-danger active:bg-ios-fill">
          Remover veículo
        </button>
      </Group>
    </PushPage>
  );
}
