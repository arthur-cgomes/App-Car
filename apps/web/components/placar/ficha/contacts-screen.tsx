"use client";

import { EMERGENCY_CONTACT_KINDS, EMERGENCY_CONTACT_KIND_BY_CODE, type EmergencyContactKind } from "@monitoring-car/shared";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { telHref, useDeleteEmergencyContact, useEmergencyContacts, useSaveEmergencyContact, type EmergencyContact } from "@/lib/api/contacts";
import { useActiveVehicle } from "@/lib/api/vehicles";
import { Chip } from "../chip";
import { InlineEmpty } from "../empty-state";
import { InputCell } from "../form-cells";
import { Group, Section, SectionHeader } from "../grouped-list";
import { Icon } from "../icon";
import { Backdrop } from "../overlays";
import { HeaderAddButton, PushPage } from "../push-page";
import { useShell } from "../shell/shell-context";
import { Sheet } from "../sheets/sheet";

export function ContactsScreen() {
  const { vehicle } = useActiveVehicle();
  const { data, isLoading } = useEmergencyContacts(vehicle?.id);
  const [editing, setEditing] = useState<{ contact?: EmergencyContact; key: number } | null>(null);
  const [open, setOpen] = useState(false);

  const openSheet = (contact?: EmergencyContact) => {
    setEditing({ contact, key: Date.now() });
    setOpen(true);
  };
  const groups = EMERGENCY_CONTACT_KINDS.map((kind) => ({ kind, contacts: data?.filter((c) => c.kind === kind.code) ?? [] })).filter((g) => g.contacts.length);

  return (
    <PushPage title="Contatos de emergência" large backHref="/vehicle" trailing={vehicle && <HeaderAddButton label="Novo contato" onClick={() => openSheet()} />}>
      {isLoading && <div className="mx-4 h-[140px] animate-pulse rounded-xl bg-ios-cell" />}
      {data?.length === 0 && (
        <div className="mx-4">
          <InlineEmpty>Nenhum contato. Toque em Novo para salvar a seguradora, o guincho ou a concessionária da rodovia.</InlineEmpty>
        </div>
      )}

      {groups.map(({ kind, contacts }) => (
        <Section key={kind.code} header={<SectionHeader>{kind.name}</SectionHeader>}>
          <Group className="mx-4">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center gap-3 border-b-[0.5px] border-ios-sep pr-3 last:border-b-0">
                <button type="button" onClick={() => openSheet(contact)} className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent py-2.5 pl-4 text-left text-ios-label active:opacity-60">
                  <div className="truncate text-[17px]">{contact.name}</div>
                  <div className="truncate text-sm text-ios-label2">{[contact.phone, contact.notes].filter(Boolean).join(" · ")}</div>
                </button>
                <a
                  href={telHref(contact.phone)}
                  aria-label={`Ligar para ${contact.name}`}
                  className="grid size-[38px] flex-none place-items-center rounded-full bg-green text-white no-underline active:opacity-60"
                >
                  <Icon name="phone" size={18} />
                </a>
              </div>
            ))}
          </Group>
        </Section>
      ))}

      {vehicle && editing && (
        <>
          <Backdrop open={open} onClose={() => setOpen(false)} />
          <ContactSheet key={editing.key} open={open} vehicleId={vehicle.id} contact={editing.contact} onClose={() => setOpen(false)} />
        </>
      )}
    </PushPage>
  );
}

function ContactSheet({ open, vehicleId, contact, onClose }: { open: boolean; vehicleId: string; contact?: EmergencyContact; onClose: () => void }) {
  const shell = useShell();
  const save = useSaveEmergencyContact(vehicleId, contact?.id);
  const remove = useDeleteEmergencyContact(vehicleId);
  const [kind, setKind] = useState<EmergencyContactKind>(contact?.kind ?? "INSURANCE");
  const [form, setForm] = useState({ name: contact?.name ?? "", phone: contact?.phone ?? "", notes: contact?.notes ?? "" });
  const [error, setError] = useState("");
  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const submit = async () => {
    if (save.isPending) return;
    if (form.name.trim().length < 2) return setError("Informe o nome do contato.");
    if (form.phone.replace(/\D/g, "").length < 3) return setError("Informe o telefone.");
    try {
      await save.mutateAsync({ kind, name: form.name.trim(), phone: form.phone.trim(), notes: form.notes.trim() || null });
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  return (
    <Sheet open={open} title={contact ? "Contato" : "Novo contato"} saveLabel={save.isPending ? "Salvando…" : "Salvar"} canSave={!save.isPending} onSave={submit} onCancel={onClose}>
      {error && (
        <div role="alert" className="text-center text-sm text-danger">
          {error}
        </div>
      )}
      <Section header={<SectionHeader>Tipo</SectionHeader>}>
        <div className="mx-4 flex flex-wrap gap-2">
          {EMERGENCY_CONTACT_KINDS.map((item) => (
            <Chip key={item.code} size="sm" active={kind === item.code} onClick={() => setKind(item.code)}>
              {item.name}
            </Chip>
          ))}
        </div>
      </Section>
      <Group className="mx-4 text-[17px]">
        <InputCell label="Nome" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={80} placeholder={EMERGENCY_CONTACT_KIND_BY_CODE[kind].name} />
        <InputCell label="Telefone" value={form.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" maxLength={30} placeholder="0800 000 0000" />
        <InputCell label="Observação" value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={200} placeholder="Ex.: nº da apólice, trecho" />
      </Group>
      {contact && (
        <Group className="mx-4">
          <button
            type="button"
            onClick={() =>
              shell.confirm({
                message: `${contact.name} será excluído dos contatos de emergência.`,
                label: "Excluir contato",
                onConfirm: () =>
                  remove.mutateAsync(contact.id).then(
                    onClose,
                    (failure) => shell.alert(errorMessage(failure)),
                  ),
              })
            }
            className="h-[46px] w-full cursor-pointer border-0 bg-transparent text-[17px] text-danger active:bg-ios-fill"
          >
            Excluir contato
          </button>
        </Group>
      )}
    </Sheet>
  );
}
