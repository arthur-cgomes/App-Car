"use client";

import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { fichaApi, useFichaMutation, useInsurances, type Insurance, type InsuranceInput } from "@/lib/api/ficha";
import { fileUrl } from "@/lib/api/expenses";
import { useActiveVehicle } from "@/lib/api/vehicles";
import { brl, formatMoneyInput, parseMoneyInput } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { InlineEmpty } from "../empty-state";
import { AttachmentCell, DateCell, InputCell, brDate, centsToInput } from "../form-cells";
import { Footnote, Group, Section, SectionHeader, ValueRow } from "../grouped-list";
import { Backdrop } from "../overlays";
import { HeaderAddButton, PushPage } from "../push-page";
import { useShell } from "../shell/shell-context";
import { Sheet } from "../sheets/sheet";
import { Masked } from "../masked";

export function InsurancesScreen() {
  const today = useToday() ?? "";
  const { vehicle } = useActiveVehicle();
  const { data, isLoading } = useInsurances(vehicle?.id);
  const [editing, setEditing] = useState<{ insurance?: Insurance; key: number } | null>(null);
  const [open, setOpen] = useState(false);

  const openSheet = (insurance?: Insurance) => {
    setEditing({ insurance, key: Date.now() });
    setOpen(true);
  };
  const current = data?.find((insurance) => insurance.endDate >= today);
  const previous = data?.filter((insurance) => insurance !== current) ?? [];

  return (
    <PushPage title="Seguros" backHref="/vehicle" trailing={vehicle && <HeaderAddButton label="Nova apólice" onClick={() => openSheet()} />}>
      {isLoading && <div className="mx-4 h-[200px] animate-pulse rounded-xl bg-ios-cell" />}
      {data?.length === 0 && (
        <div className="mx-4">
          <InlineEmpty>Nenhuma apólice. Toque em + para cadastrar e receber o lembrete de renovação.</InlineEmpty>
        </div>
      )}

      {current && (
        <Section header={<SectionHeader>Apólice vigente</SectionHeader>} footer={<Footnote>O lembrete &quot;Renovar seguro&quot; aparece em Lembretes, em destaque 15 dias antes do fim da vigência.</Footnote>}>
          <button type="button" onClick={() => openSheet(current)} className="mx-4 cursor-pointer overflow-hidden rounded-xl border-0 bg-ios-cell p-0 text-left text-ios-label active:opacity-80">
            <div className="border-b-[0.5px] border-ios-sep px-4 py-3">
              <div className="text-[17px] font-semibold">{current.insurer}</div>
              <div className="text-[13px] text-ios-tint">
                {brDate(current.startDate)} a {brDate(current.endDate)}
                {current.policyNumber ? ` · apólice ${current.policyNumber}` : ""}
              </div>
            </div>
            {current.premiumCents && (
              <ValueRow label="Prêmio" value={<Masked text={`${brl(current.premiumCents)}${current.installments ? ` em ${current.installments}x` : ""}`} />} />
            )}
            {current.deductibleCents !== null && <ValueRow label="Franquia" value={<Masked text={brl(current.deductibleCents)} />} />}
            {current.brokerContact && <ValueRow label="Corretor" value={current.brokerContact} />}
            {current.fileId && (
              <a href={fileUrl(current.fileId)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="block px-4 py-3 text-ios-tint no-underline">
                Ver apólice
              </a>
            )}
          </button>
        </Section>
      )}

      {previous.length > 0 && (
        <Section header={<SectionHeader>{current ? "Anteriores" : "Apólices"}</SectionHeader>}>
          <Group className="mx-4">
            {previous.map((insurance) => (
              <button
                key={insurance.id}
                type="button"
                onClick={() => openSheet(insurance)}
                className="group/row flex w-full cursor-pointer items-center justify-between gap-3 border-0 border-b-[0.5px] border-ios-sep bg-transparent px-4 py-3 text-left text-ios-label last:border-transparent active:bg-ios-fill"
              >
                <span className="text-base">{insurance.insurer}</span>
                <span className="text-[13px] text-ios-label2">
                  {brDate(insurance.startDate)} a {brDate(insurance.endDate)}
                </span>
              </button>
            ))}
          </Group>
        </Section>
      )}

      {vehicle && editing && (
        <>
          <Backdrop open={open} onClose={() => setOpen(false)} />
          <InsuranceSheet key={editing.key} open={open} vehicleId={vehicle.id} insurance={editing.insurance} onClose={() => setOpen(false)} />
        </>
      )}
    </PushPage>
  );
}

function InsuranceSheet({ open, vehicleId, insurance, onClose }: { open: boolean; vehicleId: string; insurance?: Insurance; onClose: () => void }) {
  const shell = useShell();
  const [form, setForm] = useState({
    insurer: insurance?.insurer ?? "",
    policyNumber: insurance?.policyNumber ?? "",
    startDate: insurance?.startDate ?? "",
    endDate: insurance?.endDate ?? "",
    premium: centsToInput(insurance?.premiumCents ?? null),
    installments: insurance?.installments ? String(insurance.installments) : "",
    deductible: centsToInput(insurance?.deductibleCents ?? null),
    brokerContact: insurance?.brokerContact ?? "",
    fileId: insurance?.fileId ?? null,
  });
  const [error, setError] = useState("");
  const save = useFichaMutation("insurances", vehicleId, (input: InsuranceInput) => fichaApi.saveInsurance(vehicleId, input, insurance?.id));
  const remove = useFichaMutation("insurances", vehicleId, () => fichaApi.deleteInsurance(vehicleId, insurance!.id));
  const set = (key: keyof typeof form, value: string | null) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };
  const money = (value: string) => (value.trim() ? parseMoneyInput(value) : null);

  const submit = async () => {
    if (form.insurer.trim().length < 2) return setError("Informe a seguradora.");
    if (!form.startDate || !form.endDate) return setError("Informe o início e o fim da vigência.");
    try {
      await save.mutateAsync({
        insurer: form.insurer.trim(),
        policyNumber: form.policyNumber.trim() || null,
        startDate: form.startDate,
        endDate: form.endDate,
        premiumCents: money(form.premium),
        installments: Number.parseInt(form.installments, 10) || null,
        deductibleCents: money(form.deductible),
        brokerContact: form.brokerContact.trim() || null,
        fileId: form.fileId,
      });
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  return (
    <Sheet open={open} title={insurance ? "Apólice" : "Nova apólice"} saveLabel={save.isPending ? "Salvando…" : "Salvar"} canSave={!save.isPending} onSave={submit} onCancel={onClose}>
      {error && (
        <div role="alert" className="text-center text-sm text-danger">
          {error}
        </div>
      )}
      <Group className="mx-4 text-[17px]">
        <InputCell label="Seguradora" value={form.insurer} onChange={(e) => set("insurer", e.target.value)} maxLength={80} placeholder="Obrigatório" />
        <InputCell label="Nº da apólice" value={form.policyNumber} onChange={(e) => set("policyNumber", e.target.value)} maxLength={60} placeholder="Opcional" />
      </Group>
      <Section header={<SectionHeader>Vigência</SectionHeader>}>
        <Group className="mx-4 text-[17px]">
          <DateCell label="Início" value={form.startDate} onChange={(value) => set("startDate", value)} />
          <DateCell label="Fim" value={form.endDate} onChange={(value) => set("endDate", value)} />
        </Group>
      </Section>
      <Section header={<SectionHeader>Valores</SectionHeader>}>
        <Group className="mx-4 text-[17px]">
          <InputCell label="Prêmio" value={form.premium} onChange={(e) => set("premium", formatMoneyInput(e.target.value))} inputMode="numeric" placeholder="R$ 0,00" />
          <InputCell label="Parcelas" value={form.installments} onChange={(e) => set("installments", e.target.value)} inputMode="numeric" placeholder="Opcional" />
          <InputCell label="Franquia" value={form.deductible} onChange={(e) => set("deductible", formatMoneyInput(e.target.value))} inputMode="numeric" placeholder="R$ 0,00" />
          <InputCell label="Corretor" value={form.brokerContact} onChange={(e) => set("brokerContact", e.target.value)} maxLength={120} placeholder="Telefone ou e-mail" />
        </Group>
      </Section>
      <Section header={<SectionHeader>Apólice</SectionHeader>} footer={<Footnote>Lance as parcelas em Gastos, na categoria Seguro.</Footnote>}>
        <Group className="mx-4 text-[17px]">
          <AttachmentCell fileId={form.fileId} onChange={(id) => set("fileId", id)} onError={setError} />
        </Group>
      </Section>
      {insurance && (
        <Group className="mx-4">
          <button
            type="button"
            onClick={() =>
              shell.confirm({
                message: "Esta apólice e o lembrete de renovação serão excluídos.",
                label: "Excluir apólice",
                onConfirm: () => remove.mutateAsync(undefined).then(onClose, (failure) => shell.alert(errorMessage(failure))),
              })
            }
            className="h-[46px] w-full cursor-pointer border-0 bg-transparent text-base text-danger active:bg-ios-fill"
          >
            Excluir apólice
          </button>
        </Group>
      )}
    </Sheet>
  );
}
