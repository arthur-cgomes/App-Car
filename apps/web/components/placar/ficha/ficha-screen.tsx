"use client";

import { formatPlate } from "@monitoring-car/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { fichaApi, useFipe } from "@/lib/api/ficha";
import { useTires } from "@/lib/api/tires";
import { useActiveVehicle, vehicleFullName, vehicleName, vehiclePlace, vehicleYears } from "@/lib/api/vehicles";
import { MONTHS_SHORT, brl, km } from "@/lib/format";
import { Chip } from "../chip";
import { InlineEmpty } from "../empty-state";
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
  const tires = useTires(vehicle?.id);
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

  const shortSize = (position: string) => tires.data?.tires.find((tire) => tire.position === position)?.size.split(" ").slice(0, 2).join(" ");
  const tireSize = shortSize("DE");
  const spareSize = shortSize("EST");

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
        <PlateBadge plate={vehicle.plate} size="lg" />
        <div className="text-[22px] font-bold">{vehicleFullName(vehicle)}</div>
        <div className="-mt-1.5 text-[15px] text-ios-label2">{[vehicleYears(vehicle), vehicle.color].filter(Boolean).join(" · ")}</div>
      </div>

      <Section
        footer={
          !fipe.data?.available ? (
            <Footnote>{fipe.isLoading ? "Consultando a tabela FIPE…" : "Valor FIPE indisponível para este veículo. Toque para informar."}</Footnote>
          ) : undefined
        }
      >
        <div className="mx-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setFipeKey(Date.now());
              setFipeOpen(true);
            }}
            className="flex min-w-0 cursor-pointer flex-col gap-0.5 rounded-[22px] border-0 bg-ios-cell p-3.5 text-left text-ios-label active:opacity-70"
          >
            <span className="text-sm text-ios-label2">Valor FIPE</span>
            <span className="font-rounded text-[22px] font-bold tabular-nums">{fipe.data?.available ? <Masked text={brl(fipe.data.valueCents)} /> : <span className="text-[17px] font-normal text-ios-tint">Informar</span>}</span>
            <span className="text-[13px] text-ios-label2">
              {fipe.data?.available ? (fipe.data.manual ? "Informado por você" : reference ? `${MONTHS_SHORT[+reference.slice(5) - 1]}/${reference.slice(0, 4)}, automático` : "Automático") : ""}
            </span>
          </button>
          <div className="flex min-w-0 flex-col gap-0.5 rounded-[22px] bg-ios-cell p-3.5">
            <span className="text-sm text-ios-label2">IPVA est.</span>
            <span className="font-rounded text-[22px] font-bold tabular-nums">{fipe.data?.available ? <Masked text={brl(fipe.data.ipvaEstimateCents)} /> : "–"}</span>
            <span className="text-[13px] text-ios-label2">4% do valor FIPE</span>
          </div>
        </div>
      </Section>

      <Section header={<SectionHeader>Dados do veículo</SectionHeader>}>
        <Group className="mx-4">
          {vehicle.modelVersion && <ValueRow label="Versão" value={vehicle.modelVersion} />}
          <ValueRow label="Odômetro" value={km(vehicle.currentOdometer)} />
          {tireSize && <ValueRow label="Pneus" value={tireSize} />}
          {spareSize && <ValueRow label="Estepe" value={`${spareSize} temporário`} />}
          {(vehicle.purchaseDate || vehicle.purchaseOdometer !== null) && (
            <ValueRow label="Compra" value={[vehicle.purchaseDate && brDate(vehicle.purchaseDate), vehicle.purchaseOdometer !== null && km(vehicle.purchaseOdometer)].filter(Boolean).join(" · ")} />
          )}
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
        <NavRow href="/vehicle/insurances" icon="shield" title="Seguro" />
        <NavRow href="/vehicle/contacts" icon="phone" title="Contatos de emergência" />
        <NavRow href="/vehicle/fuel" icon="fuel" title="Abastecimentos" />
        <NavRow href="/vehicle/reports" icon="chart" title="Relatórios" />
      </Group>

      <Group className="mx-4">
        <button type="button" onClick={remove} className="h-[46px] w-full cursor-pointer border-0 bg-transparent text-[17px] text-danger active:bg-ios-fill">
          Remover veículo
        </button>
      </Group>
      <Backdrop open={fipeOpen} onClose={() => setFipeOpen(false)} />
      <FipeSheet key={fipeKey} open={fipeOpen} vehicleId={vehicle.id} fipe={fipe.data} onClose={() => setFipeOpen(false)} />
    </PushPage>
  );
}
