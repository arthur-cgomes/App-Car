"use client";

import { TIRE_SLOT_NAMES, TIRE_SLOTS, type TireSlot } from "@monitoring-car/shared";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { tiresApi, useTireMutation, useTires } from "@/lib/api/tires";
import { LEVEL_COLOR, pressureLevel, psiText, recommendedPsi } from "@/lib/tire-status";
import { TintedButton } from "../buttons";
import { Footnote, Group } from "../grouped-list";
import { Icon } from "../icon";
import { SegmentedControl } from "../segmented-control";
import { useShell } from "../shell/shell-context";
import { Sheet } from "./sheet";

const STEP = 0.5;

export function CalibrationSheet({ open, vehicleId, onClose }: { open: boolean; vehicleId: string; onClose: () => void }) {
  const shell = useShell();
  const { data } = useTires(vehicleId);
  const [loaded, setLoaded] = useState(false);
  const [values, setValues] = useState<Partial<Record<TireSlot, number>>>({});
  const save = useTireMutation(vehicleId, (input: Partial<Record<TireSlot, number>>) => tiresApi.calibrate(vehicleId, input));

  const tires = data?.tires ?? [];
  const slots = TIRE_SLOTS.filter((slot) => tires.some((tire) => tire.position === slot));
  const valueOf = (slot: TireSlot) => values[slot] ?? tires.find((tire) => tire.position === slot)?.pressurePsi ?? (data ? recommendedPsi(data.settings, slot, loaded) : 0);
  const change = (slot: TireSlot, delta: number) => setValues((current) => ({ ...current, [slot]: valueOf(slot) + delta }));

  const submit = async () => {
    try {
      await save.mutateAsync(Object.fromEntries(slots.map((slot) => [slot, valueOf(slot)])));
      onClose();
    } catch (failure) {
      shell.alert(errorMessage(failure));
    }
  };

  return (
    <Sheet open={open} title="Calibragem" saveLabel="Salvar calibragem" canSave={!save.isPending && slots.length > 0} onSave={submit} onCancel={onClose}>
      <div className="mx-4">
        <SegmentedControl
          options={[
            { value: "empty", label: "Vazio" },
            { value: "loaded", label: "Carregado" },
          ]}
          value={loaded ? "loaded" : "empty"}
          onChange={(next) => setLoaded(next === "loaded")}
        />
      </div>
      {data && slots.length === 0 && <Footnote>Cadastre os pneus para registrar a calibragem.</Footnote>}
      {data && slots.length > 0 && (
        <>
          <Group className="mx-4">
            {slots.map((slot) => {
              const recommended = recommendedPsi(data.settings, slot, loaded);
              const value = valueOf(slot);
              return (
                <div key={slot} className="flex items-center gap-2 border-b-[0.5px] border-ios-sep px-4 py-2 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px]">{TIRE_SLOT_NAMES[slot]}</div>
                    <div className="text-[13px] text-ios-label2">Recomendado {recommended} psi</div>
                  </div>
                  <button type="button" aria-label={`Diminuir ${TIRE_SLOT_NAMES[slot]}`} onClick={() => change(slot, -STEP)} className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-ios-fill text-ios-label active:opacity-60">
                    <Icon name="minus" size={18} />
                  </button>
                  <div className="w-14 text-center font-rounded text-[20px] font-bold tabular-nums" style={{ color: pressureLevel(value, recommended) ? LEVEL_COLOR[pressureLevel(value, recommended)] : undefined }}>
                    {psiText(value)}
                  </div>
                  <button type="button" aria-label={`Aumentar ${TIRE_SLOT_NAMES[slot]}`} onClick={() => change(slot, STEP)} className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-ios-fill text-ios-label active:opacity-60">
                    <Icon name="plus" size={18} />
                  </button>
                </div>
              );
            })}
          </Group>
          <div className="mx-4">
            <TintedButton onClick={() => setValues(Object.fromEntries(slots.map((slot) => [slot, recommendedPsi(data.settings, slot, loaded)])))}>Calibrei todos no recomendado</TintedButton>
          </div>
          <Footnote>Valores em psi, com pneus frios. A medição entra no histórico de cada pneu.</Footnote>
        </>
      )}
    </Sheet>
  );
}
