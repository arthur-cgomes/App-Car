"use client";

import { EXPENSE_CATEGORY_BY_CODE, PART_SYSTEM_BY_CODE } from "@monitoring-car/shared";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { fileUrl, uploadFile, useExpense, useSaveExpense, type Expense } from "@/lib/api/expenses";
import { brTime, brl, km, longDate } from "@/lib/format";
import { GlassTextButton } from "./buttons";
import { CategoryIcon } from "./category-icon";
import { Footnote, Group, Section, SectionHeader, ValueRow } from "./grouped-list";
import { AddPhotoButton, PhotoThumb } from "./sheets/photo-picker";
import { PushHeader } from "./shell/nav-bar";
import { Masked } from "./masked";

interface ExpenseDetailProps {
  vehicleId: string | undefined;
  expenseId: string | null;
  open: boolean;
  onBack: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onViewPhoto: (src: string) => void;
  onMessage: (message: string) => void;
}

const litersLabel = (liters: number) => `${liters.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`;

export function ExpenseDetail({ vehicleId, expenseId, open, onBack, onEdit, onDelete, onViewPhoto, onMessage }: ExpenseDetailProps) {
  const { data: expense } = useExpense(vehicleId, expenseId);
  const save = useSaveExpense();
  const [uploading, setUploading] = useState(false);

  const addPhotos = async (files: File[]) => {
    if (!expense || !vehicleId) return;
    setUploading(true);
    try {
      const ids = [];
      for (const file of files) ids.push(await uploadFile(file));
      await save.mutateAsync({ vehicleId, id: expense.id, input: { attachmentIds: [...expense.attachments.map((a) => a.id), ...ids] } });
      onMessage(ids.length === 1 ? "1 nota anexada." : `${ids.length} notas anexadas.`);
    } catch (failure) {
      onMessage(errorMessage(failure));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      inert={!open}
      className="no-scrollbar absolute inset-0 z-[8] overflow-y-auto bg-ios-bg transition-[transform,box-shadow] duration-450 ease-ios"
      style={{
        transform: open ? "translateX(0)" : "translateX(102%)",
        boxShadow: open ? "-8px 0 30px color-mix(in srgb,#000 12%,transparent)" : "none",
      }}
    >
      <PushHeader
        title="Detalhes"
        onBack={onBack}
        trailing={
          expense && (
            <GlassTextButton onClick={() => onEdit(expense)}>Editar</GlassTextButton>
          )
        }
      />
      {expense && (
        <div className="mx-auto flex max-w-[720px] flex-col gap-6 pt-2" style={{ paddingBottom: "calc(var(--tabbar-bottom) + 96px)" }}>
          <div className="flex flex-col items-center gap-2.5 px-6 py-2 text-center">
            <CategoryIcon code={expense.category} size="lg" />
            <div className="font-rounded text-[40px] font-bold tracking-[-.02em] tabular-nums"><Masked text={brl(expense.amountCents)} /></div>
            <div className="text-[17px]">{expense.description}</div>
          </div>
          <Group className="mx-4">
            <ValueRow label="Categoria" value={EXPENSE_CATEGORY_BY_CODE[expense.category].name} />
            {expense.partSystem && <ValueRow label="Peça" value={PART_SYSTEM_BY_CODE[expense.partSystem].name} />}
            <ValueRow label="Data" value={expense.occurredAt ? `${longDate(expense.date)}, ${brTime(expense.occurredAt)}` : longDate(expense.date)} />
            {expense.establishment && <ValueRow label="Local" value={expense.establishment} />}
            {expense.partsCents !== null && <ValueRow label="Peças" value={<Masked text={brl(expense.partsCents)} />} />}
            {expense.laborCents !== null && <ValueRow label="Mão de obra" value={<Masked text={brl(expense.laborCents)} />} />}
            <ValueRow label="Odômetro" value={expense.odometer ? km(expense.odometer) : "—"} />
            {expense.source === "API" && <ValueRow label="Origem" value="Integração" />}
            {expense.fuel && (
              <>
                <ValueRow label="Litros" value={`${litersLabel(expense.fuel.liters)}${expense.fuel.fullTank ? " · tanque cheio" : ""}`} />
                <ValueRow label="Preço por litro" value={<Masked text={brl(Math.round(expense.amountCents / expense.fuel.liters))} />} />
              </>
            )}
          </Group>
          <Section
            header={<SectionHeader>Notas e comprovantes</SectionHeader>}
            footer={
              uploading ? <Footnote>Enviando…</Footnote> : expense.attachments.length === 0 && <Footnote>Nenhuma nota anexada a este gasto.</Footnote>
            }
          >
            <div className="mx-4 flex flex-wrap gap-2.5">
              {expense.attachments.map(({ id }) => (
                <PhotoThumb key={id} src={fileUrl(id)} label="Nota de serviço" onClick={() => onViewPhoto(fileUrl(id))} />
              ))}
              <AddPhotoButton onAdd={addPhotos} />
            </div>
          </Section>
          <Group className="mx-4">
            <button
              type="button"
              onClick={() => onDelete(expense)}
              className="h-[46px] w-full cursor-pointer border-0 bg-transparent text-base text-danger active:bg-ios-fill"
            >
              Excluir gasto
            </button>
          </Group>
        </div>
      )}
    </div>
  );
}
