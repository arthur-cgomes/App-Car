"use client";

import { TIRE_SLOTS, type TireSlot } from "@monitoring-car/shared";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { fileUrl, uploadFile } from "@/lib/api/expenses";
import { tiresApi, useTireMutation, useTires, type Tire, type TireEvent } from "@/lib/api/tires";
import { useActiveVehicle } from "@/lib/api/vehicles";
import { brl, km } from "@/lib/format";
import { psiText, tireStatus } from "@/lib/tire-status";
import { useToday } from "@/lib/use-today";
import { TintedButton } from "../buttons";
import { InlineEmpty } from "../empty-state";
import { brDate } from "../form-cells";
import { Footnote, Group, Section, SectionHeader, ValueRow } from "../grouped-list";
import { Icon } from "../icon";
import { Masked } from "../masked";
import { Backdrop } from "../overlays";
import { PushPage } from "../push-page";
import { useShell } from "../shell/shell-context";
import { OccurrenceSheet } from "../sheets/occurrence-sheet";
import { ReplaceTireSheet } from "../sheets/replace-tire-sheet";

const PRESSURE_FLOOR = 24;
const PRESSURE_CEILING = 40;

export function TireDetailScreen({ slot }: { slot: string }) {
  const today = useToday();
  const { vehicle } = useActiveVehicle();
  const { data } = useTires(vehicle?.id);
  const tire = data?.tires.find((item) => item.position === slot);

  return (
    <PushPage title="" backHref="/tires">
      {!TIRE_SLOTS.includes(slot as TireSlot) || (data && !tire) ? (
        <div className="mx-4">
          <InlineEmpty>Pneu não encontrado.</InlineEmpty>
        </div>
      ) : data && tire && vehicle && today ? (
        <Detail vehicleId={vehicle.id} tire={tire} status={tireStatus(tire, data, false, +today.slice(0, 4))} odometer={data.odometer} />
      ) : (
        <div className="mx-4 h-[300px] animate-pulse rounded-2xl bg-ios-cell" />
      )}
    </PushPage>
  );
}

function Photo({ label, fileId, onPick }: { label: string; fileId: string | null; onPick: (file: File) => void }) {
  return (
    <label className="relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-[18px] bg-ios-cell2 bg-cover bg-center text-center text-[13px] text-ios-label2 active:opacity-70" style={fileId ? { backgroundImage: `url("${fileUrl(fileId)}")` } : undefined}>
      {!fileId && (
        <span className="flex flex-col items-center gap-1 text-ios-tint">
          <Icon name="camera" size={22} />
          {label}
        </span>
      )}
      <input
        type="file"
        accept="image/*"
        aria-label={label}
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) onPick(file);
        }}
      />
    </label>
  );
}

function Detail({ vehicleId, tire, status, odometer }: { vehicleId: string; tire: Tire; status: ReturnType<typeof tireStatus>; odometer: number }) {
  const shell = useShell();
  const [sheet, setSheet] = useState<{ kind: "occurrence" | "replace"; key: number; open: boolean } | null>(null);
  const repaired = useTireMutation(vehicleId, (eventId: string) => tiresApi.repaired(vehicleId, eventId));
  const photos = useTireMutation(vehicleId, (input: { treadFileId?: string; sideFileId?: string }) => tiresApi.photos(vehicleId, tire.id, input));
  const close = () => setSheet((current) => current && { ...current, open: false });
  const damages = tire.events.filter((event) => event.kind === "DAMAGE");
  const pressures = tire.events.filter((event) => event.kind === "PRESSURE" && event.pressurePsi !== null).slice(0, 6).reverse();
  const fill = status.spare ? 100 : status.percent;

  const pick = (field: "treadFileId" | "sideFileId", file: File) =>
    uploadFile(file)
      .then((id) => photos.mutateAsync({ [field]: id }))
      .catch((failure) => shell.alert(errorMessage(failure)));

  const repair = (event: TireEvent) =>
    shell.confirm({
      message: `Marcar ${event.damageType?.toLowerCase()} como consertado?`,
      label: "Marcar como consertado",
      onConfirm: () => repaired.mutate(event.id, { onError: (failure) => shell.alert(errorMessage(failure)) }),
    });

  return (
    <>
      <div className="flex flex-col items-center gap-1 px-6 text-center">
        <div className="grid size-[150px] place-items-center rounded-full" style={{ background: `conic-gradient(${status.color} ${fill}%, var(--ios-fill) 0)` }}>
          <div className="grid size-[126px] place-content-center rounded-full bg-ios-bg">
            <div className="font-rounded text-[34px] leading-none font-bold">{status.percentText}</div>
            <div className="text-[13px] text-ios-label2">{status.lifeLabel}</div>
          </div>
        </div>
        <div className="mt-3 text-[13px] font-semibold tracking-[.06em] text-ios-label2 uppercase">{status.name}</div>
        <div className="text-[22px] font-bold">
          {status.label} · {status.fullName}
        </div>
        <div className="text-[15px] text-ios-label2">
          {tire.size}
          {status.spare ? " · temporário, até 80 km/h" : ""}
        </div>
        <div className="mt-1 inline-flex min-h-7 items-center gap-1.5 rounded-[14px] px-3 py-1 text-sm font-semibold" style={{ color: status.color, background: `color-mix(in srgb, ${status.color} 16%, transparent)` }}>
          <span className="size-2 rounded-full" style={{ background: status.color }} />
          {status.statusText}
        </div>
      </div>

      {status.issues.length > 0 && (
        <Group className="mx-4">
          {status.issues.map((issue) => (
            <div key={issue} className="flex items-center gap-2.5 border-b-[0.5px] border-ios-sep px-4 py-3 text-[15px] last:border-b-0">
              <span style={{ color: status.color }}>
                <Icon name="triangle-alert" size={18} />
              </span>
              {issue}
            </div>
          ))}
        </Group>
      )}

      <Section header={<SectionHeader>Pressão</SectionHeader>}>
        <div className="mx-4 flex flex-col gap-3 rounded-2xl bg-ios-cell p-4">
          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <div>
                <span className="font-rounded text-[34px] font-bold tabular-nums" style={{ color: status.pressureColor }}>
                  {tire.pressurePsi === null ? "–" : psiText(tire.pressurePsi)}
                </span>{" "}
                <span className="text-ios-label2">psi</span>
              </div>
              <div className="text-sm text-ios-label2">
                Recomendado {status.recommended} psi · {status.pressureColor === "var(--green)" ? "dentro do recomendado" : status.issues[0]?.toLowerCase()}
              </div>
            </div>
            {pressures.length > 0 && (
              <div aria-hidden className="flex h-12 w-20 items-end gap-1">
                {pressures.map((event) => (
                  <span
                    key={event.id}
                    className="flex-1 rounded"
                    style={{
                      height: `${Math.max(10, Math.min(100, ((event.pressurePsi! - PRESSURE_FLOOR) / (PRESSURE_CEILING - PRESSURE_FLOOR)) * 100))}%`,
                      background: Math.abs(event.pressurePsi! - status.recommended) < 1.5 ? "var(--ios-tint)" : "var(--orange)",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <TintedButton onClick={shell.openCalibration}>Registrar calibragem</TintedButton>
        </div>
      </Section>

      {!status.spare && (
        <Section header={<SectionHeader>Vida útil</SectionHeader>} footer={<Footnote>Estimativa pelo uso em cada posição. Na tração dianteira, a frente gasta cerca de 30% mais.</Footnote>}>
          <Group className="mx-4">
            <ValueRow label="Rodados" value={km(status.totalKm)} />
            <ValueRow label="Na frente" value={km(status.frontKm)} />
            <ValueRow label="Atrás" value={km(status.rearKm)} />
            <ValueRow label="Restante estimado" value={`~${km(status.remainingKm)}`} />
            <ValueRow label="Vida estimada" value={km(tire.lifeKm)} />
          </Group>
        </Section>
      )}
      {status.spare && <Footnote>Estepe temporário: use só para chegar à borracharia. Pneus envelhecem mesmo sem rodar; acima de 5 anos, troque.</Footnote>}

      <Section
        header={
          <div className="flex items-baseline justify-between px-7">
            <span className="text-[13px] text-ios-label2 uppercase">Danos e consertos</span>
            <button type="button" onClick={() => setSheet({ kind: "occurrence", key: Date.now(), open: true })} className="cursor-pointer border-0 bg-transparent p-0 text-[15px] text-ios-tint active:opacity-50">
              Registrar
            </button>
          </div>
        }
      >
        {damages.length === 0 ? (
          <div className="mx-4">
            <InlineEmpty>Nenhum dano registrado.</InlineEmpty>
          </div>
        ) : (
          <Group className="mx-4">
            {damages.map((event) => (
              <button key={event.id} type="button" disabled={event.repaired} onClick={() => repair(event)} className="flex w-full items-center gap-3 border-0 border-b-[0.5px] border-ios-sep bg-transparent px-4 py-2.5 text-left text-ios-label last:border-b-0 enabled:cursor-pointer enabled:active:opacity-60">
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px]">
                    {event.damageType} · {event.severity}
                  </span>
                  <span className="block text-sm text-ios-label2">
                    {brDate(event.date)} · {km(event.odometer)}
                    {event.costCents ? <> · <Masked text={brl(event.costCents)} /></> : null}
                  </span>
                  {event.notes && <span className="block text-sm text-ios-label2">{event.notes}</span>}
                </span>
                <span className="text-[13px] font-semibold" style={{ color: event.repaired ? "var(--green)" : "var(--orange)" }}>
                  {event.repaired ? "Consertado" : "Observar"}
                </span>
              </button>
            ))}
          </Group>
        )}
      </Section>

      <Section header={<SectionHeader>Fotos</SectionHeader>}>
        <div className="mx-4 grid grid-cols-2 gap-2.5">
          <Photo label="Banda" fileId={tire.treadFileId} onPick={(file) => pick("treadFileId", file)} />
          <Photo label="Lateral / DOT" fileId={tire.sideFileId} onPick={(file) => pick("sideFileId", file)} />
        </div>
      </Section>

      <Section header={<SectionHeader>Compra</SectionHeader>}>
        <Group className="mx-4">
          <ValueRow label="Marca e modelo" value={status.fullName} />
          {tire.priceCents !== null && <ValueRow label="Preço" value={<Masked text={brl(tire.priceCents)} />} />}
          <ValueRow label="Instalado" value={`${brDate(tire.installedDate)} · ${km(tire.installedOdometer)}`} />
          {tire.store && <ValueRow label="Loja" value={tire.store} />}
        </Group>
      </Section>

      <Section header={<SectionHeader>Histórico deste pneu</SectionHeader>}>
        <Group className="mx-4">
          {tire.events.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-3 border-b-[0.5px] border-ios-sep px-4 py-2.5 last:border-b-0">
              <span className="min-w-0">
                <span className="block text-[17px]">{event.description}</span>
                <span className="block text-sm text-ios-label2">{brDate(event.date)}</span>
              </span>
              <span className="text-sm whitespace-nowrap text-ios-label2">{km(event.odometer)}</span>
            </div>
          ))}
        </Group>
      </Section>

      <Group className="mx-4">
        <button type="button" onClick={() => setSheet({ kind: "replace", key: Date.now(), open: true })} className="h-[46px] w-full cursor-pointer border-0 bg-transparent text-[17px] text-ios-tint active:bg-ios-fill">
          Substituir este pneu
        </button>
      </Group>

      {sheet && <Backdrop open={sheet.open} onClose={close} />}
      {sheet?.kind === "occurrence" && <OccurrenceSheet key={sheet.key} open={sheet.open} vehicleId={vehicleId} slot={tire.position} onClose={close} />}
      {sheet?.kind === "replace" && <ReplaceTireSheet key={sheet.key} open={sheet.open} vehicleId={vehicleId} tire={tire} odometer={odometer} onClose={close} />}
    </>
  );
}
