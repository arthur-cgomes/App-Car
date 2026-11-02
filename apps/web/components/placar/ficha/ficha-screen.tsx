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
import { Icon } from "../icon";
import { brDate } from "../form-cells";
import { Footnote, Group, Section, SectionHeader, ValueRow } from "../grouped-list";
import { Backdrop } from "../overlays";
import { PlateBadge } from "../plate";
import { PushPage } from "../push-page";
import { useShell } from "../shell/shell-context";
import { FipeSheet } from "../sheets/fipe-sheet";
import { NavRow } from "./nav-row";
import { Masked } from "../masked";

const INTERVALS = [5000, 10000, 15000, 20000];
const OIL_INTERVALS = [
  { km: 5000, label: "6 meses ou 5 mil km" },
  { km: 10000, label: "1 ano ou 10 mil km" },
];

export function FichaScreen() {
  const router = useRouter();
  const shell = useShell();
  const client = useQueryClient();
  const { vehicle, isLoading } = useActiveVehicle();
  const fipe = useFipe(vehicle?.id);
  const [interval, setInterval] = useState<number | null>(null);
  const [oilInterval, setOilInterval] = useState<number | null>(null);
  const [fipeOpen, setFipeOpen] = useState(false);
  const [fipeKey, setFipeKey] = useState(0);

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
      shell.alert(errorMessage(error));
    }
  };

  const currentOilInterval = oilInterval ?? vehicle.oilChangeIntervalKm;
  const changeOilInterval = async (value: number) => {
    setOilInterval(value);
    try {
      await fichaApi.updateVehicle(vehicle.id, { oilChangeIntervalKm: value });
      await Promise.all([client.invalidateQueries({ queryKey: ["vehicles"] }), client.invalidateQueries({ queryKey: ["reminders", vehicle.id] })]);
    } catch (error) {
      setOilInterval(null);
      shell.alert(errorMessage(error));
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
        } catch (error) {
          shell.alert(errorMessage(error));
        }
      },
    });

  const reference = fipe.data?.available && !fipe.data.manual ? fipe.data.referenceMonth : null;

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
            {fipe.data?.available && fipe.data.manual
              ? "Valor FIPE informado por você. IPVA estimado em 4% do valor FIPE; a alíquota real varia conforme o estado."
              : reference
              ? `Tabela FIPE de ${MONTHS_LONG[+reference.slice(5) - 1]} de ${reference.slice(0, 4)}. IPVA estimado em 4% do valor FIPE; a alíquota real varia conforme o estado.`
              : fipe.isLoading
                ? "Consultando a tabela FIPE…"
                : "Valor FIPE indisponível para este veículo. Toque para informar."}
          </Footnote>
        }
      >
        <Group className="mx-4">
          <button
            type="button"
            onClick={() => {
              setFipeKey(Date.now());
              setFipeOpen(true);
            }}
            className={`flex w-full cursor-pointer items-center justify-between gap-2 border-0 bg-transparent px-4 py-3 text-left text-ios-label active:bg-ios-fill ${fipe.data?.available ? "border-b-[0.5px] border-ios-sep" : ""}`}
          >
            <span className="flex-1 text-[17px]">FIPE</span>
            <span className="font-rounded text-[26px] font-bold tabular-nums">{fipe.data?.available ? <Masked text={brl(fipe.data.valueCents)} /> : <span className="text-[17px] font-normal text-ios-tint">Informar</span>}</span>
            <span className="text-ios-label3">
              <Icon name="right" size={18} />
            </span>
          </button>
          {fipe.data?.available && <ValueRow label="IPVA estimado" value={<Masked text={brl(fipe.data.ipvaEstimateCents)} />} />}
        </Group>
      </Section>

      <Section header={<SectionHeader>Dados do veículo</SectionHeader>}>
        <Group className="mx-4">
          {vehicle.modelVersion && <ValueRow label="Versão" value={vehicle.modelVersion} />}
          <ValueRow label="Odômetro" value={km(vehicle.currentOdometer)} />
          {vehicle.purchaseDate && <ValueRow label="Data da compra" value={brDate(vehicle.purchaseDate)} />}
          {vehicle.purchaseOdometer !== null && <ValueRow label="Odômetro na compra" value={km(vehicle.purchaseOdometer)} />}
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

      <Section
        header={<SectionHeader>Troca de óleo a cada</SectionHeader>}
        footer={<Footnote>O lembrete vence no que chegar primeiro: a data ou a km. Conta a partir da última troca de óleo lançada em Gastos.</Footnote>}
      >
        <div className="mx-4 flex flex-wrap gap-2">
          {OIL_INTERVALS.map((option) => (
            <Chip key={option.km} size="sm" active={currentOilInterval === option.km} onClick={() => changeOilInterval(option.km)}>
              {option.label}
            </Chip>
          ))}
        </div>
      </Section>

      <Group className="mx-4">
        <NavRow href="/vehicle/documents" icon="file-text" title="Documentos" />
        <NavRow href="/vehicle/insurances" icon="shield" title="Seguros" />
        <NavRow href="/vehicle/contacts" icon="phone" title="Contatos de emergência" />
        <NavRow href="/vehicle/fuel" icon="fuel" title="Abastecimentos" />
        <NavRow href="/vehicle/reports" icon="chart" title="Relatórios" />
      </Group>

      <Group className="mx-4">
        <button type="button" onClick={remove} className="h-[46px] w-full cursor-pointer border-0 bg-transparent text-base text-danger active:bg-ios-fill">
          Remover veículo
        </button>
      </Group>
      <Backdrop open={fipeOpen} onClose={() => setFipeOpen(false)} />
      <FipeSheet key={fipeKey} open={fipeOpen} vehicleId={vehicle.id} fipe={fipe.data} onClose={() => setFipeOpen(false)} />
    </PushPage>
  );
}
