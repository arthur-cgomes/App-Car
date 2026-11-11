"use client";

import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { tiresApi, useTireMutation, type TireSetupInput } from "@/lib/api/tires";
import { formatKmInput, formatMoneyInput, parseMoneyInput } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { DateCell, InputCell } from "../form-cells";
import { Footnote, Group, Section, SectionHeader } from "../grouped-list";
import { useShell } from "../shell/shell-context";
import { Sheet } from "./sheet";

const digits = (value: string) => Number.parseInt(value.replace(/\D/g, ""), 10) || 0;
const small = (value: string) => value.replace(/\D/g, "").slice(0, 2);

export function TireSetupSheet({ open, vehicleId, odometer, onClose }: { open: boolean; vehicleId: string; odometer: number; onClose: () => void }) {
  const shell = useShell();
  const today = useToday() ?? "";
  const [form, setForm] = useState({
    brand: "",
    model: "",
    size: "",
    price: "",
    store: "",
    life: formatKmInput("55000"),
    odometer: formatKmInput(String(odometer)),
    date: "",
    spareSize: "",
    spareYear: "",
    rotation: formatKmInput("15000"),
    psiFront: "33",
    psiRear: "33",
    psiLoadedFront: "36",
    psiLoadedRear: "41",
    psiSpare: "35",
  });
  const set = (next: Partial<typeof form>) => setForm((current) => ({ ...current, ...next }));
  const save = useTireMutation(vehicleId, (input: TireSetupInput) => tiresApi.setup(vehicleId, input));

  const submit = async () => {
    if (form.brand.trim().length < 2) return shell.alert("Informe a marca.");
    if (!form.model.trim()) return shell.alert("Informe o modelo.");
    if (form.size.trim().length < 3) return shell.alert("Informe a medida.");
    try {
      await save.mutateAsync({
        brand: form.brand,
        model: form.model,
        size: form.size,
        priceCents: form.price ? parseMoneyInput(form.price) : null,
        store: form.store.trim() || null,
        lifeKm: digits(form.life),
        installedOdometer: digits(form.odometer),
        installedDate: form.date || today,
        spareSize: form.spareSize.trim() || null,
        spareYear: digits(form.spareYear) || null,
        settings: {
          rotationKm: digits(form.rotation),
          psiFront: digits(form.psiFront),
          psiRear: digits(form.psiRear),
          psiLoadedFront: digits(form.psiLoadedFront),
          psiLoadedRear: digits(form.psiLoadedRear),
          psiSpare: digits(form.psiSpare),
        },
      });
      onClose();
    } catch (failure) {
      shell.alert(errorMessage(failure));
    }
  };

  return (
    <Sheet open={open} title="Cadastrar pneus" saveLabel="Salvar pneus" canSave={!save.isPending} onSave={submit} onCancel={onClose}>
      <Section header={<SectionHeader>Jogo atual</SectionHeader>} footer={<Footnote>Vale para os 4 pneus. Depois você pode substituir cada um.</Footnote>}>
        <Group className="mx-4 text-[17px]">
          <InputCell label="Marca" value={form.brand} onChange={(e) => set({ brand: e.target.value })} maxLength={60} placeholder="Ex.: Pirelli" />
          <InputCell label="Modelo" value={form.model} onChange={(e) => set({ model: e.target.value })} maxLength={60} placeholder="Ex.: Cinturato P7" />
          <InputCell label="Medida" value={form.size} onChange={(e) => set({ size: e.target.value })} maxLength={30} placeholder="Ex.: 205/50 R17 89V" />
          <InputCell label="Preço por pneu" value={form.price} onChange={(e) => set({ price: formatMoneyInput(e.target.value) })} inputMode="numeric" placeholder="R$ 0,00" />
          <InputCell label="Loja" value={form.store} onChange={(e) => set({ store: e.target.value })} maxLength={120} placeholder="Opcional" />
          <InputCell label="Vida estimada" value={form.life} onChange={(e) => set({ life: formatKmInput(e.target.value) })} inputMode="numeric" />
        </Group>
      </Section>
      <Section header={<SectionHeader>Instalação</SectionHeader>}>
        <Group className="mx-4 text-[17px]">
          <InputCell label="Odômetro" value={form.odometer} onChange={(e) => set({ odometer: formatKmInput(e.target.value) })} inputMode="numeric" />
          <DateCell label="Data" value={form.date || today} onChange={(date) => set({ date })} max={today} />
        </Group>
      </Section>
      <Section header={<SectionHeader>Estepe</SectionHeader>}>
        <Group className="mx-4 text-[17px]">
          <InputCell label="Medida" value={form.spareSize} onChange={(e) => set({ spareSize: e.target.value })} maxLength={30} placeholder="Ex.: 175/70 R14 84T" />
          <InputCell label="Ano de fabricação" value={form.spareYear} onChange={(e) => set({ spareYear: e.target.value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" placeholder="Opcional" />
        </Group>
      </Section>
      <Section header={<SectionHeader>Calibragem recomendada, em psi</SectionHeader>} footer={<Footnote>Confira na etiqueta da tampa do tanque.</Footnote>}>
        <Group className="mx-4 text-[17px]">
          <InputCell label="Dianteiros" value={form.psiFront} onChange={(e) => set({ psiFront: small(e.target.value) })} inputMode="numeric" />
          <InputCell label="Traseiros" value={form.psiRear} onChange={(e) => set({ psiRear: small(e.target.value) })} inputMode="numeric" />
          <InputCell label="Dianteiros carregado" value={form.psiLoadedFront} onChange={(e) => set({ psiLoadedFront: small(e.target.value) })} inputMode="numeric" />
          <InputCell label="Traseiros carregado" value={form.psiLoadedRear} onChange={(e) => set({ psiLoadedRear: small(e.target.value) })} inputMode="numeric" />
          <InputCell label="Estepe" value={form.psiSpare} onChange={(e) => set({ psiSpare: small(e.target.value) })} inputMode="numeric" />
        </Group>
      </Section>
      <Section header={<SectionHeader>Rodízio</SectionHeader>}>
        <Group className="mx-4 text-[17px]">
          <InputCell label="A cada" value={form.rotation} onChange={(e) => set({ rotation: formatKmInput(e.target.value) })} inputMode="numeric" />
        </Group>
      </Section>
    </Sheet>
  );
}
