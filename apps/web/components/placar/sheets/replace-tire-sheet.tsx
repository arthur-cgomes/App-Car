"use client";

import { TIRE_SLOT_NAMES, type TireSlot } from "@monitoring-car/shared";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { tiresApi, useTireMutation, type Tire, type TireModelInput } from "@/lib/api/tires";
import { formatKmInput, formatMoneyInput, km, parseMoneyInput } from "@/lib/format";
import { InputCell } from "../form-cells";
import { Footnote, Group, ValueRow } from "../grouped-list";
import { useShell } from "../shell/shell-context";
import { Sheet } from "./sheet";

const digits = (value: string) => Number.parseInt(value.replace(/\D/g, ""), 10) || 0;

export function ReplaceTireSheet({ open, vehicleId, tire, odometer, onClose }: { open: boolean; vehicleId: string; tire: Tire; odometer: number; onClose: () => void }) {
  const shell = useShell();
  const slot: TireSlot = tire.position;
  const [form, setForm] = useState({ brand: tire.brand, model: tire.model, size: tire.size, price: "", life: formatKmInput("55000") });
  const set = (next: Partial<typeof form>) => setForm((current) => ({ ...current, ...next }));
  const save = useTireMutation(vehicleId, (input: TireModelInput & { position: TireSlot }) => tiresApi.replace(vehicleId, input));

  const submit = async () => {
    if (form.brand.trim().length < 2) return shell.alert("Informe a marca.");
    if (!form.model.trim()) return shell.alert("Informe o modelo.");
    try {
      await save.mutateAsync({
        position: slot,
        brand: form.brand,
        model: form.model,
        size: form.size,
        priceCents: form.price ? parseMoneyInput(form.price) : null,
        lifeKm: digits(form.life),
        store: null,
      });
      onClose();
    } catch (failure) {
      shell.alert(errorMessage(failure));
    }
  };

  return (
    <Sheet open={open} title="Substituir pneu" saveLabel="Salvar pneu novo" canSave={!save.isPending} onSave={submit} onCancel={onClose}>
      <Footnote>Novo pneu no {TIRE_SLOT_NAMES[slot].toLowerCase()}. O atual sai do histórico ativo.</Footnote>
      <Group className="mx-4 text-[17px]">
        <InputCell label="Marca" value={form.brand} onChange={(e) => set({ brand: e.target.value })} maxLength={60} />
        <InputCell label="Modelo" value={form.model} onChange={(e) => set({ model: e.target.value })} maxLength={60} />
        <InputCell label="Medida" value={form.size} onChange={(e) => set({ size: e.target.value })} maxLength={30} />
        <InputCell label="Preço" value={form.price} onChange={(e) => set({ price: formatMoneyInput(e.target.value) })} inputMode="numeric" placeholder="R$ 0,00" />
        <InputCell label="Vida estimada" value={form.life} onChange={(e) => set({ life: formatKmInput(e.target.value) })} inputMode="numeric" />
        <ValueRow label="Instalado em" value={`${km(odometer)} · hoje`} />
      </Group>
      <Footnote>Com preço informado, o valor entra em Gastos na categoria Pneus.</Footnote>
    </Sheet>
  );
}
