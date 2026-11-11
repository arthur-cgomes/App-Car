"use client";

import { useState, type ReactNode } from "react";
import { errorMessage } from "@/lib/api/client";
import { fichaApi, useFichaMutation, useInsurances, type Insurance, type InsuranceInput } from "@/lib/api/ficha";
import { fileUrl } from "@/lib/api/expenses";
import { useActiveVehicle } from "@/lib/api/vehicles";
import { brl, formatMoneyInput, parseMoneyInput } from "@/lib/format";
import { addMonths } from "@/lib/reminder-format";
import { useToday } from "@/lib/use-today";
import { InlineEmpty } from "../empty-state";
import { AttachmentCell, DateCell, InputCell, brDate, centsToInput } from "../form-cells";
import { Footnote, Group, Section, SectionHeader, ValueRow } from "../grouped-list";
import { Icon } from "../icon";
import { Backdrop } from "../overlays";
import { HeaderAddButton, PushPage } from "../push-page";
import { useShell } from "../shell/shell-context";
import { Sheet } from "../sheets/sheet";
import { Masked } from "../masked";

function nextInstallment(insurance: Insurance, today: string) {
  if (!insurance.installments || !insurance.installmentCents || !insurance.firstInstallmentDate) return null;
  const first = insurance.firstInstallmentNumber ?? 1;
  for (let number = first; number <= insurance.installments; number++) {
    const date = addMonths(insurance.firstInstallmentDate, number - first);
    if (date > today) return { number, date };
  }
  return "paid" as const;
}

function PolicyTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[18px] bg-ios-cell2 px-3 py-2.5">
      <div className="text-[13px] text-ios-label2">{label}</div>
      <div className="text-[17px] font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function InsurancesScreen() {
  const today = useToday() ?? "";
  const { vehicle } = useActiveVehicle();
  const { data, isLoading } = useInsurances(vehicle?.id);
  const [editing, setEditing] = useState<{ insurance?: Insurance; key: number } | null>(null);
  const [open, setOpen] = useState(false);

  const openSheet = (insurance?: Insurance) => {
    setEditing((previous) => ({ insurance, key: (previous?.key ?? 0) + 1 }));
    setOpen(true);
  };
  const current = data?.find((insurance) => insurance.endDate >= today);
  const next = current ? nextInstallment(current, today) : null;
  const previous = data?.filter((insurance) => insurance !== current) ?? [];

  return (
    <PushPage title="Seguro" large backHref="/vehicle" trailing={vehicle && (current ? <HeaderAddButton label="Editar apólice" text="Editar" onClick={() => openSheet(current)} /> : <HeaderAddButton label="Nova apólice" onClick={() => openSheet()} />)}>
      {isLoading && <div className="mx-4 h-[200px] animate-pulse rounded-xl bg-ios-cell" />}
      {data?.length === 0 && (
        <div className="mx-4">
          <InlineEmpty>Nenhuma apólice. Toque em Novo para cadastrar e receber o lembrete de renovação.</InlineEmpty>
        </div>
      )}

      {current && (
        <>
          <div className="mx-4 flex flex-col gap-3 rounded-2xl bg-ios-cell p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[20px] leading-tight font-bold">{current.insurer}</div>
                {current.policyNumber && <div className="text-[15px] text-ios-label2">Apólice {current.policyNumber}</div>}
                <div className="mt-1 text-[15px] text-ios-label2">
                  Vigência {brDate(current.startDate)} a {brDate(current.endDate)}
                </div>
              </div>
              <span className="rounded-lg px-2 py-0.5 text-xs font-semibold text-green" style={{ background: "color-mix(in srgb, var(--green) 16%, transparent)" }}>
                Vigente
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <PolicyTile label="Valor total" value={current.premiumCents ? <Masked text={brl(current.premiumCents)} /> : "–"} />
              <PolicyTile label={current.installments ? `${current.installments} parcelas de` : "Parcelas"} value={current.installmentCents ? <Masked text={brl(current.installmentCents)} /> : "–"} />
              <PolicyTile label="Franquia" value={current.deductibleCents !== null ? <Masked text={brl(current.deductibleCents)} /> : "–"} />
              <PolicyTile label="Próxima parcela" value={next && next !== "paid" ? brDate(next.date) : next === "paid" ? "Todas lançadas" : "–"} />
            </div>
          </div>
          <Section footer={<Footnote>Cada parcela entra em Gastos na data da cobrança. O fim da vigência cria o lembrete Renovar seguro.</Footnote>}>
            <Group className="mx-4">
              {current.brokerContact && <ValueRow label="Corretor" value={current.brokerContact} />}
              {current.fileId && (
                <a href={fileUrl(current.fileId)} target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center justify-between gap-3 border-b-[0.5px] border-ios-sep px-4 text-[17px] text-ios-label no-underline last:border-b-0">
                  Apólice em PDF
                  <span className="text-ios-tint">
                    <Icon name="file-text" />
                  </span>
                </a>
              )}
              <ValueRow label="Parcelas em Gastos" value={current.installmentCents ? "Automático" : "Desligado"} />
            </Group>
          </Section>
        </>
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
    installment: centsToInput(insurance?.installmentCents ?? null),
    firstInstallmentNumber: insurance?.firstInstallmentNumber ? String(insurance.firstInstallmentNumber) : "",
    firstInstallmentDate: insurance?.firstInstallmentDate ?? "",
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
    const installmentCents = money(form.installment);
    if (installmentCents && !form.firstInstallmentDate) return setError("Informe a data da parcela.");
    try {
      await save.mutateAsync({
        insurer: form.insurer.trim(),
        policyNumber: form.policyNumber.trim() || null,
        startDate: form.startDate,
        endDate: form.endDate,
        premiumCents: money(form.premium),
        installments: Number.parseInt(form.installments, 10) || null,
        installmentCents,
        firstInstallmentNumber: installmentCents ? Number.parseInt(form.firstInstallmentNumber, 10) || 1 : null,
        firstInstallmentDate: installmentCents ? form.firstInstallmentDate : null,
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
    <Sheet open={open} title={insurance ? "Editar apólice" : "Nova apólice"} saveLabel={save.isPending ? "Salvando…" : "Salvar"} canSave={!save.isPending} onSave={submit} onCancel={onClose}>
      {error && (
        <div role="alert" className="text-center text-sm text-danger">
          {error}
        </div>
      )}
      <Group className="mx-4 text-[17px]">
        <InputCell label="Seguradora" value={form.insurer} onChange={(e) => set("insurer", e.target.value)} maxLength={80} placeholder="Obrigatório" />
        <InputCell label="N° da apólice" value={form.policyNumber} onChange={(e) => set("policyNumber", e.target.value)} maxLength={60} placeholder="Opcional" />
      </Group>
      <Section header={<SectionHeader>Vigência</SectionHeader>}>
        <Group className="mx-4 text-[17px]">
          <DateCell label="Início" value={form.startDate} onChange={(value) => set("startDate", value)} />
          <DateCell label="Fim" value={form.endDate} onChange={(value) => set("endDate", value)} />
        </Group>
      </Section>
      <Section
        header={<SectionHeader>Valores</SectionHeader>}
        footer={<Footnote>Apólice transferida? Informe a partir de qual parcela ela passa a ser sua e a data dela. Cada parcela entra em Gastos na data da cobrança.</Footnote>}
      >
        <Group className="mx-4 text-[17px]">
          <InputCell label="Valor total" value={form.premium} onChange={(e) => set("premium", formatMoneyInput(e.target.value))} inputMode="numeric" placeholder="R$ 0,00" />
          <InputCell label="Parcelas" value={form.installments} onChange={(e) => set("installments", e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="Opcional" />
          <InputCell label="Valor da parcela" value={form.installment} onChange={(e) => set("installment", formatMoneyInput(e.target.value))} inputMode="numeric" placeholder="R$ 0,00" />
          <InputCell label="A partir da parcela" value={form.firstInstallmentNumber} onChange={(e) => set("firstInstallmentNumber", e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="1" />
          <DateCell label="Data dessa parcela" value={form.firstInstallmentDate} onChange={(value) => set("firstInstallmentDate", value)} />
          <InputCell label="Franquia" value={form.deductible} onChange={(e) => set("deductible", formatMoneyInput(e.target.value))} inputMode="numeric" placeholder="R$ 0,00" />
        </Group>
      </Section>
      <Group className="mx-4 text-[17px]">
        <InputCell label="Corretor" value={form.brokerContact} onChange={(e) => set("brokerContact", e.target.value)} maxLength={120} placeholder="Telefone ou e-mail" />
        <AttachmentCell fileId={form.fileId} onChange={(id) => set("fileId", id)} onError={setError} />
      </Group>
      {insurance && (
        <Group className="mx-4">
          <button
            type="button"
            onClick={() =>
              shell.confirm({
                message: "Esta apólice e o lembrete de renovação serão excluídos. As parcelas já lançadas continuam em Gastos.",
                label: "Excluir apólice",
                onConfirm: () => remove.mutateAsync(undefined).then(onClose, (failure) => shell.alert(errorMessage(failure))),
              })
            }
            className="h-[46px] w-full cursor-pointer border-0 bg-transparent text-[17px] text-danger active:bg-ios-fill"
          >
            Excluir apólice
          </button>
        </Group>
      )}
    </Sheet>
  );
}
