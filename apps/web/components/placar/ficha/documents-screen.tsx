"use client";

import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { DOCUMENT_TYPES, documentTypeName, fichaApi, useDocuments, useFichaMutation, type DocumentInput, type VehicleDocument } from "@/lib/api/ficha";
import { useActiveVehicle } from "@/lib/api/vehicles";
import { brl, parseMoneyInput } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { TintedButton } from "../buttons";
import { CategoryIcon } from "../category-icon";
import { Chip } from "../chip";
import { InlineEmpty } from "../empty-state";
import { AttachmentCell, DateCell, InputCell, brDate, centsToInput } from "../form-cells";
import { Group, ROW_BODY, Section, SectionHeader } from "../grouped-list";
import { Icon } from "../icon";
import { Backdrop } from "../overlays";
import { HeaderAddButton, PushPage } from "../push-page";
import { useShell } from "../shell/shell-context";
import { Sheet } from "../sheets/sheet";

function status(document: VehicleDocument, today: string) {
  if (document.paidAt) return { label: "Pago", bg: "var(--ios-fill)", color: "var(--ios-label2)" };
  if (document.dueDate && document.dueDate < today) return { label: "Vencido", bg: "color-mix(in srgb, var(--danger) 18%, transparent)", color: "var(--danger-soft)" };
  return { label: "Pendente", bg: "var(--ios-tintbg)", color: "var(--ios-tint)" };
}

function detail(document: VehicleDocument) {
  if (document.paidAt) return [`Pago em ${brDate(document.paidAt)}`, document.amountCents && brl(document.amountCents)].filter(Boolean).join(" · ");
  return [document.amountCents && brl(document.amountCents), document.dueDate && `vence ${brDate(document.dueDate)}`].filter(Boolean).join(" · ") || "Sem vencimento";
}

export function DocumentsScreen() {
  const today = useToday() ?? "";
  const { vehicle } = useActiveVehicle();
  const { data, isLoading } = useDocuments(vehicle?.id);
  const [editing, setEditing] = useState<{ document?: VehicleDocument; key: number } | null>(null);
  const [open, setOpen] = useState(false);

  const openSheet = (document?: VehicleDocument) => {
    setEditing({ document, key: Date.now() });
    setOpen(true);
  };

  return (
    <PushPage title="Documentos" backHref="/veiculo" trailing={vehicle && <HeaderAddButton label="Novo documento" onClick={() => openSheet()} />}>
      {isLoading && <div className="mx-4 h-[140px] animate-pulse rounded-xl bg-ios-cell" />}
      {data?.length === 0 && (
        <div className="mx-4">
          <InlineEmpty>Nenhum documento. Toque em + para adicionar IPVA, licenciamento ou CRLV.</InlineEmpty>
        </div>
      )}
      {!!data?.length && (
        <Group className="mx-4">
          {data.map((document) => {
            const badge = status(document, today);
            return (
              <button
                key={document.id}
                type="button"
                onClick={() => openSheet(document)}
                className="group/row flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent py-0 pr-0 pl-4 text-left active:bg-ios-fill"
              >
                <CategoryIcon code="DOCUMENTS" />
                <div className={`flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-4 ${ROW_BODY}`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-base text-ios-label">{[documentTypeName(document.type), document.year].filter(Boolean).join(" ")}</div>
                    <div className="text-[13px] text-ios-label2">{detail(document)}</div>
                  </div>
                  {document.fileId && (
                    <span className="text-ios-label2">
                      <Icon name="clip" size={15} />
                    </span>
                  )}
                  <span className="rounded-md px-2 py-[3px] text-xs font-semibold" style={{ background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                </div>
              </button>
            );
          })}
        </Group>
      )}

      {vehicle && editing && (
        <>
          <Backdrop open={open} onClose={() => setOpen(false)} />
          <DocumentSheet key={editing.key} open={open} vehicleId={vehicle.id} document={editing.document} onClose={() => setOpen(false)} />
        </>
      )}
    </PushPage>
  );
}

function DocumentSheet({ open, vehicleId, document, onClose }: { open: boolean; vehicleId: string; document?: VehicleDocument; onClose: () => void }) {
  const shell = useShell();
  const [form, setForm] = useState({
    type: document?.type ?? "IPVA",
    year: document?.year ? String(document.year) : String(new Date().getFullYear()),
    amount: centsToInput(document?.amountCents ?? null),
    dueDate: document?.dueDate ?? "",
    fileId: document?.fileId ?? null,
    notes: document?.notes ?? "",
  });
  const [error, setError] = useState("");
  const save = useFichaMutation("documents", vehicleId, (input: DocumentInput) => fichaApi.saveDocument(vehicleId, input, document?.id));
  const pay = useFichaMutation("documents", vehicleId, () => fichaApi.payDocument(vehicleId, document!.id));
  const remove = useFichaMutation("documents", vehicleId, () => fichaApi.deleteDocument(vehicleId, document!.id));
  const set = (key: keyof typeof form, value: string | null) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const submit = async () => {
    const amountCents = form.amount.trim() ? parseMoneyInput(form.amount) : null;
    if (form.amount.trim() && !amountCents) return setError("Valor inválido.");
    try {
      await save.mutateAsync({
        type: form.type as DocumentInput["type"],
        year: Number.parseInt(form.year, 10) || null,
        amountCents,
        dueDate: form.dueDate || null,
        fileId: form.fileId,
        notes: form.notes.trim() || null,
      });
      onClose();
      shell.toast(document ? "Documento atualizado." : "Documento adicionado.");
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  return (
    <Sheet open={open} title={document ? "Documento" : "Novo documento"} saveLabel={save.isPending ? "Salvando…" : "Salvar"} canSave={!save.isPending} onSave={submit} onCancel={onClose}>
      {error && (
        <div role="alert" className="text-center text-sm text-danger">
          {error}
        </div>
      )}
      <Section header={<SectionHeader>Tipo</SectionHeader>}>
        <div className="mx-4 flex flex-wrap gap-2">
          {DOCUMENT_TYPES.map((type) => (
            <Chip key={type.value} size="sm" active={form.type === type.value} onClick={() => set("type", type.value)}>
              {type.label}
            </Chip>
          ))}
        </div>
      </Section>
      <Group className="mx-4 text-[17px]">
        <InputCell label="Ano" value={form.year} onChange={(e) => set("year", e.target.value)} inputMode="numeric" placeholder="Opcional" />
        <InputCell label="Valor" value={form.amount} onChange={(e) => set("amount", e.target.value)} inputMode="decimal" placeholder="R$ 0,00" />
        <DateCell label="Vencimento" value={form.dueDate} onChange={(value) => set("dueDate", value)} />
        <InputCell label="Notas" value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={300} placeholder="Opcional" />
      </Group>
      <Section header={<SectionHeader>Arquivo</SectionHeader>}>
        <Group className="mx-4 text-[17px]">
          <AttachmentCell fileId={form.fileId} onChange={(id) => set("fileId", id)} onError={setError} />
        </Group>
      </Section>
      {document && !document.paidAt && document.amountCents && (
        <div className="mx-4">
          <TintedButton
            onClick={async () => {
              try {
                await pay.mutateAsync(undefined);
                onClose();
                shell.toast("Documento pago e lançado em Gastos.");
              } catch (failure) {
                setError(errorMessage(failure));
              }
            }}
          >
            {pay.isPending ? "Lançando…" : "Marcar como pago"}
          </TintedButton>
        </div>
      )}
      {document && (
        <Group className="mx-4">
          <button
            type="button"
            onClick={() =>
              shell.confirm({
                message: "Este documento será excluído.",
                label: "Excluir documento",
                onConfirm: () => remove.mutateAsync(undefined).then(onClose, (failure) => shell.toast(errorMessage(failure))),
              })
            }
            className="h-[46px] w-full cursor-pointer border-0 bg-transparent text-base text-danger active:bg-ios-fill"
          >
            Excluir documento
          </button>
        </Group>
      )}
    </Sheet>
  );
}
