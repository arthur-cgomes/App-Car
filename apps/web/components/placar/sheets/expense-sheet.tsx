"use client";

import {
  CATEGORIES_REQUIRING_PART_SYSTEM,
  CATEGORIES_WITH_PART_SYSTEM,
  EXPENSE_CATEGORY_BY_CODE,
  PART_SYSTEMS,
  type ExpenseCategoryCode,
  type PartSystemCode,
} from "@monitoring-car/shared";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { fileUrl, uploadFile, useSaveExpense, type Expense } from "@/lib/api/expenses";
import { centsToMoneyInput, formatKmInput, formatMoneyInput, parseMoneyInput } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { CategoryGrid } from "../category-grid";
import { Chip } from "../chip";
import { DatePickerCell } from "../date-picker";
import { Footnote, Group, Section, SectionHeader } from "../grouped-list";
import { Icon } from "../icon";
import { Switch } from "../switch";
import { AddPhotoButton, PhotoThumb } from "./photo-picker";
import { Sheet } from "./sheet";

export interface SheetPhoto {
  key: string;
  preview: string;
  fileId?: string;
  file?: File;
}

export interface ExpenseFormValues {
  category: ExpenseCategoryCode;
  amount: string;
  date: string;
  description: string;
  odometer: string;
  establishment: string;
  parts: string;
  labor: string;
  partSystem: PartSystemCode | null;
  liters: string;
  fullTank: boolean;
  photos: SheetPhoto[];
}

const EMPTY_FORM: ExpenseFormValues = {
  category: "FUEL",
  amount: "",
  date: "",
  description: "",
  odometer: "",
  establishment: "",
  parts: "",
  labor: "",
  partSystem: null,
  liters: "",
  fullTank: false,
  photos: [],
};

const decimal = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2, useGrouping: false });

function fromExpense(expense: Expense): ExpenseFormValues {
  return {
    category: expense.category,
    amount: centsToMoneyInput(expense.amountCents),
    date: expense.date,
    description: expense.description === EXPENSE_CATEGORY_BY_CODE[expense.category].name ? "" : expense.description,
    odometer: expense.odometer ? formatKmInput(String(expense.odometer)) : "",
    establishment: expense.establishment ?? "",
    parts: expense.partsCents === null ? "" : centsToMoneyInput(expense.partsCents),
    labor: expense.laborCents === null ? "" : centsToMoneyInput(expense.laborCents),
    partSystem: expense.partSystem,
    liters: expense.fuel ? decimal(expense.fuel.liters) : "",
    fullTank: expense.fuel?.fullTank ?? false,
    photos: expense.attachments.map(({ id }) => ({ key: id, preview: fileUrl(id), fileId: id })),
  };
}

const FUEL_SUGGESTIONS = ["Gasolina comum", "Gasolina aditivada"];

const EXAMPLES: Record<ExpenseCategoryCode, { establishment: string; description: string }> = {
  FUEL: { establishment: "Ex.: Posto Shell", description: "Ex.: Gasolina comum" },
  MAINTENANCE: { establishment: "Ex.: Oficina do Zé", description: "Ex.: Troca de pastilhas" },
  PARTS: { establishment: "Ex.: Auto Peças Central", description: "Ex.: Jogo de pastilhas" },
  DOCUMENTS: { establishment: "Ex.: Detran", description: "Ex.: Licenciamento 2026" },
  FINES: { establishment: "Opcional", description: "Ex.: Excesso de velocidade" },
  INSURANCE: { establishment: "Ex.: Porto Seguro", description: "Ex.: Parcela do seguro" },
  OTHER: { establishment: "Opcional", description: "Ex.: Lavagem" },
};

const CELL_LABEL = "flex min-h-[46px] items-center gap-3 border-b-[0.5px] border-ios-sep px-4 last:border-b-0";
const CELL_INPUT = "min-w-0 flex-1 border-0 bg-transparent text-right text-[17px] text-ios-label outline-0";

interface ExpenseSheetProps {
  open: boolean;
  vehicleId: string;
  expense?: Expense;
  prefill?: Partial<ExpenseFormValues>;
  onCancel: () => void;
  onSaved: (expense: Expense) => void;
}

export function ExpenseSheet({ open, vehicleId, expense, prefill, onCancel, onSaved }: ExpenseSheetProps) {
  const today = useToday() ?? "";
  const save = useSaveExpense();
  const [form, setForm] = useState<ExpenseFormValues>(() =>
    expense ? fromExpense(expense) : { ...EMPTY_FORM, date: today, ...prefill },
  );
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const busy = uploading || save.isPending;

  const set = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const showParts = CATEGORIES_WITH_PART_SYSTEM.includes(form.category);
  const partsRequired = CATEGORIES_REQUIRING_PART_SYSTEM.includes(form.category);
  const isFuel = form.category === "FUEL";
  const isMaintenance = form.category === "MAINTENANCE";
  const split = isMaintenance && !!(form.parts.trim() || form.labor.trim());
  const splitCents = (value: string) => (value.trim() ? (parseMoneyInput(value) ?? Number.NaN) : 0);
  const amountShown = split ? centsToMoneyInput(splitCents(form.parts) + splitCents(form.labor)) : form.amount;

  const submit = async () => {
    if (busy) return;
    const partsCents = split ? splitCents(form.parts) : null;
    const laborCents = split ? splitCents(form.labor) : null;
    if (split && (Number.isNaN(partsCents) || Number.isNaN(laborCents) || partsCents! < 0 || laborCents! < 0)) {
      return setError("Informe os valores de peças e mão de obra.");
    }
    const amountCents = split ? partsCents! + laborCents! : parseMoneyInput(form.amount);
    if (!amountCents || amountCents <= 0) return setError("Informe um valor maior que zero.");
    if (!form.date) return setError("Informe a data.");
    if (partsRequired && !form.partSystem) return setError("Escolha a classificação da peça.");
    const liters = form.liters.trim() ? Number(form.liters.replace(/\./g, "").replace(",", ".")) : null;
    if (isFuel && liters !== null && !(liters > 0)) return setError("Informe os litros.");

    try {
      setUploading(true);
      const attachmentIds = [];
      for (const photo of form.photos) attachmentIds.push(photo.fileId ?? (await uploadFile(photo.file!)));
      setUploading(false);

      const saved = await save.mutateAsync({
        vehicleId,
        id: expense?.id,
        input: {
          category: form.category,
          partSystem: showParts ? form.partSystem : null,
          description: form.description.trim() || null,
          amountCents,
          date: form.date,
          odometer: Number.parseInt(form.odometer.replace(/\D/g, ""), 10) || null,
          establishment: form.establishment.trim() || null,
          partsCents,
          laborCents,
          attachmentIds,
          fuel: isFuel && liters ? { liters: Math.round(liters * 100) / 100, fullTank: form.fullTank } : null,
        },
      });
      form.photos.forEach((photo) => photo.file && URL.revokeObjectURL(photo.preview));
      onSaved(saved);
    } catch (failure) {
      setUploading(false);
      setError(errorMessage(failure));
    }
  };

  return (
    <Sheet
      open={open}
      title={expense ? "Editar gasto" : "Novo gasto"}
      saveLabel={busy ? "Salvando…" : "Salvar"}
      canSave={!busy}
      onSave={submit}
      onCancel={onCancel}
    >
      <div className="flex flex-col items-center gap-0.5 px-4 py-2">
        <div className="flex items-baseline gap-1.5 font-rounded">
          <span className="text-[28px] font-semibold text-ios-label2">R$</span>
          <input
            value={amountShown}
            onChange={(event) => set("amount", formatMoneyInput(event.target.value))}
            readOnly={split}
            inputMode="numeric"
            placeholder="0,00"
            aria-label="Valor"
            className="w-[200px] border-0 bg-transparent font-rounded text-[52px] font-bold tracking-[-.02em] text-ios-label tabular-nums outline-0"
          />
        </div>
        {error && (
          <div role="alert" className="text-center text-sm text-danger">
            {error}
          </div>
        )}
      </div>

      <Section header={<SectionHeader>Categoria</SectionHeader>}>
        <CategoryGrid value={form.category} onChange={(code) => set("category", code)} />
      </Section>

      {showParts && (
        <Section
          header={<SectionHeader>Classificação da peça</SectionHeader>}
          footer={<Footnote>{partsRequired ? "Obrigatório para peças." : "Opcional. Ajuda a ver quanto cada sistema do carro custa."}</Footnote>}
        >
          <div className="mx-4 flex flex-wrap gap-2">
            {PART_SYSTEMS.map((system) => (
              <Chip
                key={system.code}
                size="sm"
                active={form.partSystem === system.code}
                onClick={() => set("partSystem", form.partSystem === system.code ? null : system.code)}
              >
                {system.name}
              </Chip>
            ))}
          </div>
        </Section>
      )}

      {isMaintenance && (
        <Section
          header={<SectionHeader>Custos da manutenção</SectionHeader>}
          footer={<Footnote>{split ? "O valor total é a soma de peças e mão de obra." : "Opcional: separe o que foi peça e o que foi mão de obra."}</Footnote>}
        >
          <Group className="mx-4 text-[17px]">
            <label className={CELL_LABEL}>
              <span>Peças</span>
              <input value={form.parts} onChange={(event) => set("parts", formatMoneyInput(event.target.value))} inputMode="numeric" placeholder="R$ 0,00" className={CELL_INPUT} />
            </label>
            <label className={CELL_LABEL}>
              <span>Mão de obra</span>
              <input value={form.labor} onChange={(event) => set("labor", formatMoneyInput(event.target.value))} inputMode="numeric" placeholder="R$ 0,00" className={CELL_INPUT} />
            </label>
          </Group>
        </Section>
      )}

      <Group className="mx-4 text-[17px]">
        <DatePickerCell label="Data" value={form.date} onChange={(value) => set("date", value)} />
        <label className={CELL_LABEL}>
          <span>Odômetro</span>
          <input value={form.odometer} onChange={(event) => set("odometer", formatKmInput(event.target.value))} inputMode="numeric" placeholder="km" className={CELL_INPUT} />
        </label>
        {isFuel && (
          <>
            <label className={CELL_LABEL}>
              <span>Litros</span>
              <input value={form.liters} onChange={(event) => set("liters", event.target.value)} inputMode="decimal" placeholder="Opcional" className={CELL_INPUT} />
            </label>
            <div className={CELL_LABEL}>
              <span className="flex-1">Tanque cheio</span>
              <Switch checked={form.fullTank} onChange={(checked) => set("fullTank", checked)} label="Tanque cheio" />
            </div>
          </>
        )}
        <label className={CELL_LABEL}>
          <span>Local</span>
          <input
            value={form.establishment}
            onChange={(event) => set("establishment", event.target.value)}
            maxLength={120}
            placeholder={EXAMPLES[form.category].establishment}
            className={CELL_INPUT}
          />
        </label>
        <label className={CELL_LABEL}>
          <span>Descrição</span>
          <input
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            maxLength={200}
            placeholder={EXAMPLES[form.category].description}
            className={CELL_INPUT}
          />
        </label>
      </Group>

      {isFuel && (
        <div className="-mt-3 mx-4 flex flex-wrap gap-2">
          {FUEL_SUGGESTIONS.map((suggestion) => (
            <Chip key={suggestion} size="sm" active={form.description === suggestion} onClick={() => set("description", suggestion)}>
              {suggestion}
            </Chip>
          ))}
        </div>
      )}

      <Section
        header={<SectionHeader>Notas e comprovantes</SectionHeader>}
        footer={<Footnote>{isFuel ? "Com litros e tanque cheio calculamos o consumo médio. " : ""}Fotografe a nota de serviço ou escolha da galeria.</Footnote>}
      >
        <div className="mx-4 flex flex-wrap gap-2.5">
          {form.photos.map((photo) => (
            <div key={photo.key} className="relative size-20 flex-none">
              <PhotoThumb src={photo.preview} label="Nota anexada" />
              <button
                type="button"
                aria-label="Remover foto"
                onClick={() => set("photos", form.photos.filter((p) => p.key !== photo.key))}
                className="absolute -top-1.5 -right-1.5 grid size-6 cursor-pointer place-items-center rounded-full border-2 border-ios-bg bg-ios-label2 p-0 text-ios-bg"
              >
                <Icon name="x" size={14} stroke={2.5} />
              </button>
            </div>
          ))}
          <AddPhotoButton
            onAdd={(files) =>
              set("photos", [...form.photos, ...files.map((file) => ({ key: crypto.randomUUID(), preview: URL.createObjectURL(file), file }))])
            }
          />
        </div>
      </Section>
    </Sheet>
  );
}
