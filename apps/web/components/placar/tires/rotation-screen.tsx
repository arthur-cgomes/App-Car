"use client";

import { TIRE_POSITIONS, parallelRotation, suggestedRotation, type TirePosition, type TireRotationKind } from "@monitoring-car/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { tiresApi, useTireMutation, useTires, type TireOverview } from "@/lib/api/tires";
import { useActiveVehicle } from "@/lib/api/vehicles";
import { cx } from "@/lib/cx";
import { formatKmInput } from "@/lib/format";
import { mountedPositions } from "@/lib/tire-status";
import { useToday } from "@/lib/use-today";
import { PrimaryButton } from "../buttons";
import { InlineEmpty } from "../empty-state";
import { Footnote, Group, Section, SectionHeader, ValueRow } from "../grouped-list";
import { PushPage } from "../push-page";
import { SegmentedControl } from "../segmented-control";
import { useShell } from "../shell/shell-context";
import { pillDate } from "../date-picker";

const SPOTS: Record<TirePosition, string> = { DE: "left-2.5 top-[60px]", DD: "right-2.5 top-[60px]", TE: "left-2.5 top-[202px]", TD: "right-2.5 top-[202px]" };

export function RotationScreen() {
  const { vehicle } = useActiveVehicle();
  const { data } = useTires(vehicle?.id);
  const ready = data && data.tires.filter((tire) => tire.position !== "EST").length === TIRE_POSITIONS.length;
  return (
    <PushPage title="Planejar rodízio" backHref="/tires" large subtitle="Toque em dois pneus para trocar, ou arraste um sobre o outro.">
      {data && !ready && (
        <div className="mx-4">
          <InlineEmpty>Cadastre os quatro pneus para planejar o rodízio.</InlineEmpty>
        </div>
      )}
      {vehicle && ready && <Planner key={data.tires.map((tire) => tire.id + tire.position).join()} vehicleId={vehicle.id} data={data} />}
    </PushPage>
  );
}

function Planner({ vehicleId, data }: { vehicleId: string; data: TireOverview }) {
  const router = useRouter();
  const shell = useShell();
  const today = useToday();
  const current = mountedPositions(data.tires);
  const [draft, setDraft] = useState(() => suggestedRotation(current));
  const [mode, setMode] = useState<TireRotationKind>("SUGGESTED");
  const [selected, setSelected] = useState<TirePosition | null>(null);
  const [dragging, setDragging] = useState<TirePosition | null>(null);
  const [odometer, setOdometer] = useState(formatKmInput(String(data.odometer)));
  const save = useTireMutation(vehicleId, (input: Parameters<typeof tiresApi.rotate>[1]) => tiresApi.rotate(vehicleId, input));

  const tireById = (id: string) => data.tires.find((tire) => tire.id === id)!;
  const swap = (a: TirePosition, b: TirePosition) => {
    if (a === b) return;
    setDraft((value) => ({ ...value, [a]: value[b], [b]: value[a] }));
    setMode("CUSTOM");
    setSelected(null);
    setDragging(null);
  };
  const tap = (position: TirePosition) => {
    if (!selected) return setSelected(position);
    if (selected === position) return setSelected(null);
    swap(selected, position);
  };
  const chooseMode = (next: TireRotationKind) => {
    setMode(next);
    setSelected(null);
    if (next === "SUGGESTED") setDraft(suggestedRotation(current));
    if (next === "PARALLEL") setDraft(parallelRotation(current));
  };

  const moves = TIRE_POSITIONS.filter((position) => draft[position] !== current[position]).map((position) => {
    const tire = tireById(draft[position]);
    return { tire, text: `${tire.position} → ${position}` };
  });

  const submit = async () => {
    try {
      await save.mutateAsync({ kind: mode, odometer: Number.parseInt(odometer.replace(/\D/g, ""), 10) || data.odometer, positions: draft });
      router.push("/tires");
    } catch (failure) {
      shell.alert(errorMessage(failure));
    }
  };

  return (
    <>
      <div className="mx-4">
        <SegmentedControl
          options={[
            { value: "SUGGESTED", label: "Sugerido" },
            { value: "PARALLEL", label: "Paralelo" },
            { value: "CUSTOM", label: "Manual" },
          ]}
          value={mode}
          onChange={chooseMode}
        />
      </div>

      <div className="relative mx-4 h-[360px] overflow-hidden rounded-2xl bg-ios-cell">
        <div className="absolute inset-x-0 top-3 text-center text-xs font-semibold tracking-[.08em] text-ios-label3">FRENTE · TRAÇÃO</div>
        <div className="absolute top-10 left-1/2 h-[290px] w-[90px] -translate-x-1/2 rounded-[44px_44px_34px_34px] bg-ios-car" />
        {TIRE_POSITIONS.map((position) => {
          const tire = tireById(draft[position]);
          const moved = draft[position] !== current[position];
          return (
            <button
              key={position}
              type="button"
              draggable
              aria-pressed={selected === position}
              onDragStart={() => setDragging(position)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dragging && swap(dragging, position)}
              onClick={() => tap(position)}
              className={cx("absolute flex w-[106px] cursor-pointer flex-col gap-0.5 rounded-[18px] border-0 bg-ios-cell2 px-3 py-3 text-left text-ios-label transition-shadow active:opacity-70", SPOTS[position])}
              style={{ boxShadow: selected === position ? "inset 0 0 0 2px var(--ios-tint)" : "none" }}
            >
              <span className="text-[13px] font-bold text-ios-label2">{position}</span>
              <span className="text-[17px] font-bold">Pneu {tire.number}</span>
              <span className="text-[13px]" style={{ color: moved ? "var(--ios-tint)" : "var(--ios-label2)" }}>
                {moved ? `vem do ${tire.position}` : "fica"}
              </span>
            </button>
          );
        })}
      </div>

      {moves.length > 0 && (
        <Section header={<SectionHeader>Movimentos</SectionHeader>}>
          <Group className="mx-4">
            {moves.map((move) => (
              <ValueRow key={move.tire.id} label={`Pneu ${move.tire.number}`} value={move.text} />
            ))}
            <ValueRow label="Estepe" value="fica no porta-malas" />
          </Group>
        </Section>
      )}

      <Footnote>Sugerido para tração dianteira: dianteiros vão direto para trás, traseiros cruzam para a frente. O estepe é temporário e não entra no rodízio.</Footnote>

      <Group className="mx-4 text-[17px]">
        <label className="flex min-h-[45px] items-center gap-3 border-b-[0.5px] border-ios-sep px-4">
          <span className="flex-1">Odômetro</span>
          <input value={odometer} onChange={(event) => setOdometer(formatKmInput(event.target.value))} inputMode="numeric" className="w-28 border-0 bg-transparent text-right text-[17px] text-ios-label outline-0" />
          <span className="text-ios-label2">km</span>
        </label>
        <ValueRow label="Data" value={today ? `Hoje, ${pillDate(today)}` : ""} />
      </Group>

      <div className="mx-4">
        <PrimaryButton onClick={submit} disabled={save.isPending || moves.length === 0}>
          {save.isPending ? "Registrando…" : "Registrar rodízio"}
        </PrimaryButton>
      </div>
    </>
  );
}
