"use client";

import { TIRE_POSITIONS, TIRE_ROTATION_KIND_NAMES, type TirePosition, type TireSlot } from "@monitoring-car/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTires, type Tire, type TireOverview } from "@/lib/api/tires";
import { useActiveVehicle, vehicleName } from "@/lib/api/vehicles";
import { km } from "@/lib/format";
import { psiText, recommendedPsi, rotationStatus, tireStatus } from "@/lib/tire-status";
import { useToday } from "@/lib/use-today";
import { PrimaryButton } from "../buttons";
import { brDate } from "../form-cells";
import { Footnote, Group, Section, SectionHeader, ValueRow } from "../grouped-list";
import { Icon, type IconName } from "../icon";
import { LargeTitle } from "../large-title";
import { Backdrop } from "../overlays";
import { useShell } from "../shell/shell-context";
import { OccurrenceSheet } from "../sheets/occurrence-sheet";
import { TireSetupSheet } from "../sheets/tire-setup-sheet";
import { Switch } from "../switch";

const WHEELS: Record<TirePosition, string> = { DE: "left-[29%] top-[84px]", DD: "right-[29%] top-[84px]", TE: "left-[29%] top-[250px]", TD: "right-[29%] top-[250px]" };
const CARDS: Record<TirePosition, string> = { DE: "left-2.5 top-14", DD: "right-2.5 top-14", TE: "left-2.5 top-[200px]", TD: "right-2.5 top-[200px]" };

export function TiresScreen() {
  const { vehicle, isLoading } = useActiveVehicle();
  const { data } = useTires(vehicle?.id);
  const today = useToday();
  const [setup, setSetup] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const year = today ? +today.slice(0, 4) : 0;

  const mainTire = data?.tires.find((tire) => tire.position !== "EST");
  const subtitle = mainTire ? `${mainTire.size.split(" ").slice(0, 2).join(" ")} · ${km(data!.odometer)}` : vehicle ? vehicleName(vehicle) : "";

  return (
    <div className="flex flex-col gap-[18px] pb-6">
      <LargeTitle title="Pneus" subtitle={subtitle} />
      {!isLoading && !vehicle && <Empty text="Adicione um veículo para acompanhar os pneus." />}
      {vehicle && !data && <div className="mx-4 h-[370px] animate-pulse rounded-2xl bg-ios-cell" />}
      {vehicle && data?.tires.length === 0 && (
        <>
          <Empty title="Nenhum pneu cadastrado" text="Os pneus deste veículo ainda não foram cadastrados." />
          <div className="mx-4">
            <PrimaryButton
              onClick={() => {
                setSetup(Date.now());
                setOpen(true);
              }}
            >
              Cadastrar pneus
            </PrimaryButton>
          </div>
          {setup && (
            <>
              <Backdrop open={open} onClose={() => setOpen(false)} />
              <TireSetupSheet key={setup} open={open} vehicleId={vehicle.id} odometer={vehicle.currentOdometer} onClose={() => setOpen(false)} />
            </>
          )}
        </>
      )}
      {vehicle && data && data.tires.length > 0 && today && <TiresBody vehicleId={vehicle.id} data={data} year={year} />}
    </div>
  );
}

function Empty({ title, text }: { title?: string; text: string }) {
  return (
    <div className="mx-4 flex flex-col items-center gap-1 rounded-2xl bg-ios-cell px-6 py-8 text-center">
      <span className="mb-2 text-ios-label2">
        <Icon name="tire" size={32} />
      </span>
      {title && <div className="text-[17px] font-semibold">{title}</div>}
      <div className="text-[15px] text-pretty text-ios-label2">{text}</div>
    </div>
  );
}

function TiresBody({ vehicleId, data, year }: { vehicleId: string; data: TireOverview; year: number }) {
  const router = useRouter();
  const shell = useShell();
  const [loaded, setLoaded] = useState(false);
  const [occurrence, setOccurrence] = useState<{ key: number; open: boolean } | null>(null);
  const status = (tire: Tire) => tireStatus(tire, data, loaded, year);
  const at = (slot: TireSlot) => data.tires.find((tire) => tire.position === slot);
  const spare = at("EST");
  const rotation = rotationStatus(data);
  const size = (data.tires.find((tire) => tire.position !== "EST") ?? data.tires[0]).size.split(" ").slice(0, 2).join(" ");
  const actions: { icon: IconName; label: string; onClick: () => void }[] = [
    { icon: "compress", label: "Calibrar", onClick: shell.openCalibration },
    { icon: "wrench", label: "Ocorrência", onClick: () => setOccurrence({ key: Date.now(), open: true }) },
    { icon: "rotate", label: "Rodízio", onClick: () => router.push("/tires/rotation") },
  ];

  return (
    <>
      <div className="relative mx-4 h-[370px] overflow-hidden rounded-2xl bg-ios-cell">
        <div className="absolute inset-x-0 top-3 text-center text-xs font-semibold tracking-[.08em] text-ios-label3">FRENTE</div>
        <div className="absolute top-9 left-1/2 h-[304px] w-[120px] -translate-x-1/2 rounded-[58px_58px_44px_44px] bg-ios-car">
          <div className="absolute inset-x-3.5 top-[78px] h-[52px] rounded-[18px_18px_8px_8px] bg-ios-bg opacity-55" />
          <div className="absolute inset-x-[18px] top-[224px] h-[30px] rounded-[6px_6px_14px_14px] bg-ios-bg opacity-55" />
        </div>
        {TIRE_POSITIONS.map((position) => {
          const tire = at(position);
          if (!tire) return null;
          const item = status(tire);
          return <div key={position} aria-hidden className={`absolute h-12 w-3.5 rounded-md ${WHEELS[position]}`} style={{ background: item.color }} />;
        })}
        {TIRE_POSITIONS.map((position) => {
          const tire = at(position);
          if (!tire) return null;
          const item = status(tire);
          return (
            <Link key={position} href={`/tires/${position}`} aria-label={`${item.name}: ${item.percentText} de vida`} className={`absolute flex w-[92px] flex-col gap-0.5 rounded-[18px] bg-ios-cell2 px-3 py-2.5 text-ios-label no-underline active:opacity-70 ${CARDS[position]}`}>
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ios-label2">
                <span className="size-2 flex-none rounded-full" style={{ background: item.color }} />
                {position}
              </span>
              <span className="font-rounded text-[26px] leading-tight font-bold tabular-nums">{item.percentText}</span>
              <span className="text-[13px] text-ios-label2">
                <span className="font-semibold" style={{ color: item.pressureColor }}>
                  {tire.pressurePsi === null ? "–" : psiText(tire.pressurePsi)}
                </span>{" "}
                psi
              </span>
            </Link>
          );
        })}
        <div className="absolute inset-x-0 bottom-3 text-center text-[13px] text-ios-label2">Vida restante · pressão atual</div>
      </div>

      {spare && (
        <Link href="/tires/EST" className="mx-4 flex items-center gap-3.5 rounded-[22px] bg-ios-cell px-4 py-3.5 text-ios-label no-underline active:opacity-70">
          <span className="grid size-10 flex-none place-items-center rounded-full border-[5px] border-ios-cell2">
            <span className="size-2 rounded-full" style={{ background: status(spare).color }} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-semibold">Estepe · {spare.size.split(" ").slice(0, 2).join(" ")}</span>
            <span className="block text-sm text-ios-label2">Temporário, fora do rodízio{status(spare).issues[0] ? ` · ${status(spare).issues[0]}` : ""}</span>
          </span>
          <span className="text-right">
            <span className="block font-semibold" style={{ color: status(spare).pressureColor }}>
              {spare.pressurePsi === null ? "–" : psiText(spare.pressurePsi)}
            </span>
            <span className="block text-xs text-ios-label2">psi</span>
          </span>
        </Link>
      )}

      <div className="mx-4 flex flex-col gap-2.5 rounded-2xl bg-ios-cell p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-semibold text-ios-label2">Rodízio</span>
          <span className="text-[15px] text-ios-label2">A cada {km(data.settings.rotationKm)}</span>
        </div>
        <div className="font-rounded text-[26px] font-bold tabular-nums">{rotation.leftText}</div>
        <div className="h-1.5 overflow-hidden rounded-[3px] bg-ios-fill">
          <div className="h-full rounded-[3px]" style={{ width: `${rotation.percent}%`, background: rotation.color }} />
        </div>
        <div className="flex justify-between text-[13px] text-ios-label2">
          <span>{km(rotation.last)}</span>
          <span>{km(rotation.next)}</span>
        </div>
        <PrimaryButton onClick={() => router.push("/tires/rotation")}>
          <Icon name="rotate" size={20} />
          Planejar rodízio
        </PrimaryButton>
      </div>

      <div className="mx-4 grid grid-cols-3 gap-2.5">
        {actions.map((action) => (
          <button key={action.label} type="button" onClick={action.onClick} className="flex cursor-pointer flex-col gap-2 rounded-[22px] border-0 bg-ios-cell px-3 py-3.5 text-left text-ios-label active:opacity-70">
            <span className="grid size-9 place-items-center rounded-full bg-ios-tintbg text-ios-tint">
              <Icon name={action.icon} size={20} />
            </span>
            <span className="text-[15px] font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      <Section header={<SectionHeader>Calibragem recomendada · {size}</SectionHeader>} footer={<Footnote>Confira na etiqueta da tampa do tanque. Calibre com os pneus frios.</Footnote>}>
        <Group className="mx-4">
          <div className="flex min-h-[52px] items-center border-b-[0.5px] border-ios-sep px-4 text-[17px]">
            <span className="flex-1">Carro carregado</span>
            <Switch checked={loaded} onChange={setLoaded} label="Carro carregado" />
          </div>
          <ValueRow label="Dianteiros" value={`${recommendedPsi(data.settings, "DE", loaded)} psi`} />
          <ValueRow label="Traseiros" value={`${recommendedPsi(data.settings, "TE", loaded)} psi`} />
          {spare && <ValueRow label="Estepe temporário" value={`${data.settings.psiSpare} psi`} />}
        </Group>
      </Section>

      <Section header={<SectionHeader>Histórico de rodízios</SectionHeader>}>
        <Group className="mx-4">
          {data.rotations.map((item) => (
            <div key={item.id} className="flex items-center gap-3 border-b-[0.5px] border-ios-sep px-4 py-2.5 last:border-b-0">
              <span className="text-ios-label2">
                <Icon name="rotate" size={20} />
              </span>
              <span>
                <span className="block text-[17px]">{TIRE_ROTATION_KIND_NAMES[item.kind]}</span>
                <span className="block text-sm text-ios-label2">
                  {brDate(item.date)} · {km(item.odometer)}
                </span>
              </span>
            </div>
          ))}
        </Group>
      </Section>

      {occurrence && (
        <>
          <Backdrop open={occurrence.open} onClose={() => setOccurrence({ ...occurrence, open: false })} />
          <OccurrenceSheet key={occurrence.key} open={occurrence.open} vehicleId={vehicleId} slot="DE" onClose={() => setOccurrence({ ...occurrence, open: false })} />
        </>
      )}
    </>
  );
}
