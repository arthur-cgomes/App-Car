"use client";

import {
  CATEGORIES_REQUIRING_PART_SYSTEM,
  CATEGORIES_WITH_PART_SYSTEM,
  EXPENSE_CATEGORY_BY_CODE,
  PART_SYSTEM_BY_CODE,
  PART_SYSTEM_CHOICES,
  type ExpenseCategoryCode,
  type PartSystemCode,
} from "@monitoring-car/shared";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { fileUrl, uploadFile, useSaveExpense, type Expense } from "@/lib/api/expenses";
import { centsToMoneyInput, formatKmInput, formatLitersInput, formatMoneyInput, litersToInput, parseLitersInput, parseMoneyInput } from "@/lib/format";
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
  fullTank: true,
  photos: [],
};


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
    liters: expense.fuel ? litersToInput(expense.fuel.liters) : "",
    fullTank: expense.fuel?.fullTank ?? false,
    photos: expense.attachments.map(({ id }) => ({ key: id, preview: fileUrl(id), fileId: id })),
  };
}

const FUEL_SUGGESTIONS = ["Gasolina comum", "Gasolina aditivada", "Etanol"];
const STATION_SUGGESTIONS = ["Posto Shell Rodoviária", "Posto Chiquito"];
const snapshot = (form: ExpenseFormValues) => JSON.stringify({ ...form, photos: form.photos.map((photo) => photo.key) });

const EXAMPLES: Record<ExpenseCategoryCode, { establishment: string; description: string }> = {
  FUEL: { establishment: "Local", description: "Ex.: Gasolina comum, 40 L" },
  MAINTENANCE: { establishment: "Ex.: Oficina do Zé", description: "Ex.: Troca de pastilhas" },
  PARTS: { establishment: "Ex.: Auto Peças Central", description: "Ex.: Jogo de pastilhas" },
  TIRES: { establishment: "Ex.: Rodoviária Pneus", description: "Ex.: Alinhamento e balanceamento" },
  DOCUMENTS: { establishment: "Ex.: Detran", description: "Ex.: Licenciamento 2026" },
  FINES: { establishment: "Opcional", description: "Ex.: Excesso de velocidade" },
  INSURANCE: { establishment: "Ex.: Porto Seguro", description: "Ex.: Parcela do seguro" },
  OTHER: { establishment: "Local", description: "Ex.: Lavagem" },
};

const CELL_LABEL = "flex min-h-[46px] items-center gap-3 border-b-[0.5px] border-ios-sep px-4 last:border-b-0";
const CELL_INPUT = "min-w-0 flex-1 border-0 bg-transparent text-right text-[17px] text-ios-label outline-0";
const CELL_TEXT = "min-w-0 flex-1 border-0 bg-transparent text-[17px] text-ios-label outline-0";

interface ExpenseSheetProps {
  open: boolean;
  vehicleId: string;
  expense?: Expense;
  prefill?: Partial<ExpenseFormValues>;
  onCancel: () => void;
  onSubmit: (saving: Promise<Expense>) => void;
  onDirtyChange: (dirty: boolean) => void;
}

export function ExpenseSheet({ open, vehicleId, expense, prefill, onCancel, onSubmit, onDirtyChange }: ExpenseSheetProps) {
  const today = useToday() ?? "";
  const save = useSaveExpense();
  const [form, setForm] = useState<ExpenseFormValues>(() =>
    expense ? fromExpense(expense) : { ...EMPTY_FORM, date: today, ...prefill },
  );
  const [initial] = useState(() => snapshot(form));
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const dirty = snapshot(form) !== initial;

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  const busy = uploading || save.isPending;

  const set = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const showParts = CATEGORIES_WITH_PART_SYSTEM.includes(form.category);
  const partsRequired = CATEGORIES_REQUIRING_PART_SYSTEM.includes(form.category);
  const legacyPart = form.partSystem && !PART_SYSTEM_CHOICES.some((system) => system.code === form.partSystem) ? PART_SYSTEM_BY_CODE[form.partSystem] : null;
  const partChoices = legacyPart ? [...PART_SYSTEM_CHOICES, legacyPart] : PART_SYSTEM_CHOICES;
  const isFuel = form.category === "FUEL";
  const isMaintenance = form.category === "MAINTENANCE";
  const split = isMaintenance && !!(form.parts.trim() || form.labor.trim());
  const splitCents = (value: string) => (value.trim() ? (parseMoneyInput(value) ?? Number.NaN) : 0);
  const amountShown = split ? centsToMoneyInput(splitCents(form.parts) + splitCents(form.labor)) : form.amount;

  const litersValue = parseLitersInput(form.liters);
  const amountValue = parseMoneyInput(form.amount);
  const pricePerLiter = litersValue && amountValue ? `R$ ${(amountValue / 100 / litersValue).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}` : null;

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
    const liters = parseLitersInput(form.liters);
    if (isFuel && liters !== null && !(liters > 0)) return setError("Informe os litros.");

    setUploading(true);
    const saving = (async () => {
      const attachmentIds = await Promise.all(form.photos.map((photo) => photo.fileId ?? uploadFile(photo.file!)));
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
          fuel: isFuel && liters ? { liters, fullTank: form.fullTank } : null,
        },
      });
      form.photos.forEach((photo) => photo.file && URL.revokeObjectURL(photo.preview));
      return saved;
    })();
    saving.catch((failure) => setError(errorMessage(failure))).finally(() => setUploading(false));
    onSubmit(saving);
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
      <div className="flex flex-col items-center gap-0.5 px-4">
        <div className="text-[15px] text-ios-label2">{split ? "Total, peças + mão de obra" : "Valor"}</div>
        <div className="flex items-baseline justify-center gap-1.5 font-rounded">
          <span className="text-[24px] font-semibold text-ios-label2">R$</span>
          <input
            value={amountShown}
            onChange={(event) => set("amount", formatMoneyInput(event.target.value))}
            readOnly={split}
            inputMode="numeric"
            placeholder="0,00"
            aria-label="Valor"
            className="min-w-0 border-0 bg-transparent font-rounded text-[48px] font-bold tracking-[-.02em] text-ios-label tabular-nums outline-0 placeholder:text-ios-label3"
            style={{ width: `${Math.max(4, (amountShown || "0,00").length) * 0.6}em` }}
          />
        </div>
        {error && (
          <div role="alert" className="text-center text-sm text-danger">
            {error}
          </div>
        )}
      </div>

      <CategoryGrid value={form.category} onChange={(code) => set("category", code)} />

      <Group className="mx-4 text-[17px]">
        <label className={CELL_LABEL}>
          <input
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            maxLength={200}
            aria-label="Descrição"
            placeholder={EXAMPLES[form.category].description}
            className={CELL_TEXT}
          />
        </label>
        <label className={CELL_LABEL}>
          <input
            value={form.establishment}
            onChange={(event) => set("establishment", event.target.value)}
            maxLength={120}
            aria-label="Local"
            placeholder={EXAMPLES[form.category].establishment}
            className={CELL_TEXT}
          />
        </label>
        <label className={CELL_LABEL}>
          <span>Odômetro</span>
          <input value={form.odometer} onChange={(event) => set("odometer", formatKmInput(event.target.value))} inputMode="numeric" placeholder="km" className={CELL_INPUT} />
        </label>
        <DatePickerCell label="Data" value={form.date} onChange={(value) => set("date", value)} />
      </Group>

      {isFuel && (
        <>
          <Group className="mx-4 text-[17px]">
            <label className={CELL_LABEL}>
              <span>Litros</span>
              <input value={form.liters} onChange={(event) => set("liters", formatLitersInput(event.target.value))} inputMode="numeric" placeholder="Opcional" className={CELL_INPUT} />
            </label>
            <div className={CELL_LABEL}>
              <span className="flex-1">Preço por litro</span>
              <span className="text-ios-label2 tabular-nums">{pricePerLiter ?? "–"}</span>
            </div>
            <div className={CELL_LABEL}>
              <span className="flex-1">Tanque cheio</span>
              <Switch checked={form.fullTank} onChange={(checked) => set("fullTank", checked)} label="Tanque cheio" />
            </div>
          </Group>
          <Section header={<SectionHeader>Posto</SectionHeader>}>
            <div className="mx-4 flex flex-wrap gap-2">
              {STATION_SUGGESTIONS.map((station) => (
                <Chip key={station} size="sm" active={form.establishment === station} onClick={() => set("establishment", station)}>
                  {station}
                </Chip>
              ))}
            </div>
          </Section>
          <Section header={<SectionHeader>Combustível</SectionHeader>}>
            <div className="mx-4 flex flex-wrap gap-2">
              {FUEL_SUGGESTIONS.map((suggestion) => (
                <Chip key={suggestion} size="sm" active={form.description === suggestion} onClick={() => set("description", suggestion)}>
                  {suggestion}
                </Chip>
              ))}
            </div>
          </Section>
        </>
      )}

      {showParts && (
        <Section
          header={<SectionHeader>Sistema do carro</SectionHeader>}
          footer={<Footnote>{partsRequired ? "Obrigatório para peças." : "Opcional. Ajuda a ver quanto cada sistema do carro custa."}</Footnote>}
        >
          <div className="mx-4 flex flex-wrap gap-2">
            {partChoices.map((system) => (
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
                <Icon name="x" size={14} />
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
