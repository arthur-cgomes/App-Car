"use client";

import { TIRE_DAMAGE_TYPES, TIRE_SEVERITIES, TIRE_SLOTS, type TireSeverity, type TireSlot } from "@monitoring-car/shared";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { tiresApi, useTireMutation, type OccurrenceInput } from "@/lib/api/tires";
import { formatMoneyInput, parseMoneyInput } from "@/lib/format";
import { Chip } from "../chip";
import { AttachmentCell } from "../form-cells";
import { Footnote, Group, Section, SectionHeader } from "../grouped-list";
import { SegmentedControl } from "../segmented-control";
import { useShell } from "../shell/shell-context";
import { Switch } from "../switch";
import { Sheet } from "./sheet";

const slotLabel = (slot: TireSlot) => (slot === "EST" ? "Estepe" : slot);

export function OccurrenceSheet({ open, vehicleId, slot, onClose }: { open: boolean; vehicleId: string; slot: TireSlot; onClose: () => void }) {
  const shell = useShell();
  const [form, setForm] = useState({ position: slot, damageType: TIRE_DAMAGE_TYPES[0] as string, severity: "Leve" as TireSeverity, repaired: false, cost: "", notes: "", fileId: null as string | null });
  const set = (next: Partial<typeof form>) => setForm((current) => ({ ...current, ...next }));
  const save = useTireMutation(vehicleId, (input: OccurrenceInput) => tiresApi.occurrence(vehicleId, input));

  const submit = async () => {
    try {
      await save.mutateAsync({
        position: form.position,
        damageType: form.damageType,
        severity: form.severity,
        repaired: form.repaired,
        costCents: form.cost ? parseMoneyInput(form.cost) : null,
        notes: form.notes.trim() || null,
        fileId: form.fileId,
      });
      onClose();
    } catch (failure) {
      shell.alert(errorMessage(failure));
    }
  };

  return (
    <Sheet open={open} title="Ocorrência" saveLabel="Salvar ocorrência" canSave={!save.isPending} onSave={submit} onCancel={onClose}>
      <Section header={<SectionHeader>Pneu</SectionHeader>}>
        <div className="mx-4 flex flex-wrap gap-2">
          {TIRE_SLOTS.map((item) => (
            <Chip key={item} active={form.position === item} onClick={() => set({ position: item })}>
              {slotLabel(item)}
            </Chip>
          ))}
        </div>
      </Section>
      <Section header={<SectionHeader>O que aconteceu</SectionHeader>}>
        <div className="mx-4 flex flex-wrap gap-2">
          {TIRE_DAMAGE_TYPES.map((item) => (
            <Chip key={item} active={form.damageType === item} onClick={() => set({ damageType: item })}>
              {item}
            </Chip>
          ))}
        </div>
      </Section>
      <Section header={<SectionHeader>Gravidade</SectionHeader>}>
        <div className="mx-4">
          <SegmentedControl options={TIRE_SEVERITIES.map((item) => ({ value: item, label: item }))} value={form.severity} onChange={(severity) => set({ severity })} />
        </div>
      </Section>
      <Section footer={<Footnote>Com custo informado, o valor entra em Gastos na categoria Pneus.</Footnote>}>
        <Group className="mx-4 text-[17px]">
          <div className="flex min-h-[50px] items-center gap-3 border-b-[0.5px] border-ios-sep px-4">
            <span className="flex-1">Já foi consertado</span>
            <Switch checked={form.repaired} onChange={(repaired) => set({ repaired })} label="Já foi consertado" />
          </div>
          <label className="flex min-h-[45px] items-center gap-3 border-b-[0.5px] border-ios-sep px-4">
            <span className="flex-1">Custo</span>
            <span className="text-ios-label3">R$</span>
            <input value={form.cost} onChange={(event) => set({ cost: formatMoneyInput(event.target.value) })} inputMode="numeric" placeholder="0,00" className="w-28 border-0 bg-transparent text-right text-[17px] text-ios-label outline-0" />
          </label>
          <div className="flex min-h-[45px] items-center border-b-[0.5px] border-ios-sep px-4">
            <input value={form.notes} onChange={(event) => set({ notes: event.target.value })} maxLength={200} aria-label="Borracharia ou observação" placeholder="Borracharia ou observação" className="w-full border-0 bg-transparent text-[17px] text-ios-label outline-0" />
          </div>
          <AttachmentCell fileId={form.fileId} onChange={(fileId) => set({ fileId })} onError={shell.alert} />
        </Group>
      </Section>
    </Sheet>
  );
}
