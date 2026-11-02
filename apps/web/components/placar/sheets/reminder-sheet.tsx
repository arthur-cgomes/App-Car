"use client";

import type { ExpenseCategoryCode } from "@monitoring-car/shared";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { formatKmInput } from "@/lib/format";
import { useSaveReminder, type Reminder } from "@/lib/api/reminders";
import { CategoryGrid } from "../category-grid";
import { Chip } from "../chip";
import { DatePickerCell } from "../date-picker";
import { Footnote, Group, Section, SectionHeader } from "../grouped-list";
import { Sheet } from "./sheet";

type Repeat = "NONE" | "6M" | "12M" | "10000KM";

const REPEATS: { value: Repeat; label: string }[] = [
  { value: "NONE", label: "Não repetir" },
  { value: "6M", label: "A cada 6 meses" },
  { value: "12M", label: "A cada 12 meses" },
  { value: "10000KM", label: "A cada 10.000 km" },
];

const CELL_LABEL = "flex min-h-[46px] items-center gap-3 border-b-[0.5px] border-ios-sep px-4 last:border-b-0";
const CELL_INPUT = "min-w-0 flex-1 border-0 bg-transparent text-right text-[17px] text-ios-label outline-0";

function repeatOf(reminder?: Reminder): Repeat {
  if (reminder?.repeatKm) return "10000KM";
  if (reminder?.repeatMonths === 6) return "6M";
  if (reminder?.repeatMonths) return "12M";
  return "NONE";
}

interface ReminderSheetProps {
  open: boolean;
  vehicleId: string;
  reminder?: Reminder;
  onCancel: () => void;
  onSaved: () => void;
  onDelete: (reminder: Reminder) => void;
}

export function ReminderSheet({ open, vehicleId, reminder, onCancel, onSaved, onDelete }: ReminderSheetProps) {
  const save = useSaveReminder();
  const [title, setTitle] = useState(reminder?.title ?? "");
  const [category, setCategory] = useState<ExpenseCategoryCode>(reminder?.category ?? "MAINTENANCE");
  const [dueDate, setDueDate] = useState(reminder?.dueDate ?? "");
  const [dueOdometer, setDueOdometer] = useState(reminder?.dueOdometer ? formatKmInput(String(reminder.dueOdometer)) : "");
  const [repeat, setRepeat] = useState<Repeat>(repeatOf(reminder));
  const [error, setError] = useState("");

  const submit = async () => {
    if (save.isPending) return;
    const odometer = Number.parseInt(dueOdometer.replace(/\D/g, ""), 10) || null;
    if (title.trim().length < 2) return setError("Informe o título do lembrete.");
    if (!dueDate && !odometer) return setError("Informe uma data ou uma quilometragem.");
    if (repeat === "10000KM" && !odometer) return setError("Para repetir por km, informe a quilometragem.");
    if ((repeat === "6M" || repeat === "12M") && !dueDate) return setError("Para repetir por meses, informe a data.");
    try {
      await save.mutateAsync({
        vehicleId,
        id: reminder?.id,
        input: {
          title: title.trim(),
          category,
          dueDate: dueDate || null,
          dueOdometer: odometer,
          repeatMonths: repeat === "6M" ? 6 : repeat === "12M" ? 12 : null,
          repeatKm: repeat === "10000KM" ? 10000 : null,
        },
      });
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  return (
    <Sheet
      open={open}
      title={reminder ? "Editar lembrete" : "Novo lembrete"}
      saveLabel={save.isPending ? "Salvando…" : "Salvar"}
      canSave={!save.isPending}
      onSave={submit}
      onCancel={onCancel}
    >
      <Group className="mx-4 text-[17px]">
        <label className={CELL_LABEL}>
          <span>Título</span>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError("");
            }}
            maxLength={120}
            placeholder="Ex.: renovar seguro"
            className={CELL_INPUT}
          />
        </label>
      </Group>
      {error && (
        <div role="alert" className="-mt-3 text-center text-sm text-danger">
          {error}
        </div>
      )}

      <Section header={<SectionHeader>Categoria</SectionHeader>}>
        <CategoryGrid value={category} onChange={setCategory} />
      </Section>

      <Section header={<SectionHeader>Quando</SectionHeader>} footer={<Footnote>O lembrete fica em destaque 15 dias antes da data e 500 km antes da quilometragem.</Footnote>}>
        <Group className="mx-4 text-[17px]">
          <DatePickerCell
            label="Data"
            value={dueDate}
            optional
            onChange={(value) => {
              setDueDate(value);
              setError("");
            }}
          />
          <label className={CELL_LABEL}>
            <span>Quilometragem</span>
            <input
              value={dueOdometer}
              onChange={(event) => {
                setDueOdometer(formatKmInput(event.target.value));
                setError("");
              }}
              inputMode="numeric"
              placeholder="Opcional"
              className={CELL_INPUT}
            />
          </label>
        </Group>
      </Section>

      <Section header={<SectionHeader>Repetir</SectionHeader>}>
        <div className="mx-4 flex flex-wrap gap-2">
          {REPEATS.map((option) => (
            <Chip key={option.value} size="sm" active={repeat === option.value} onClick={() => setRepeat(option.value)}>
              {option.label}
            </Chip>
          ))}
        </div>
      </Section>

      {reminder && (
        <Group className="mx-4">
          <button
            type="button"
            onClick={() => onDelete(reminder)}
            className="h-[46px] w-full cursor-pointer border-0 bg-transparent text-base text-danger active:bg-ios-fill"
          >
            Excluir lembrete
          </button>
        </Group>
      )}
    </Sheet>
  );
}
