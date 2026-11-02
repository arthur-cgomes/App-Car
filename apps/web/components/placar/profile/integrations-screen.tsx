"use client";

import { useState, useSyncExternalStore } from "react";
import { FUEL_ENDPOINT, useApiKeys, useCreateApiKey, useRevokeApiKey, type ApiKey } from "@/lib/api/api-keys";
import { errorMessage } from "@/lib/api/client";
import { brTime } from "@/lib/format";
import { InlineEmpty } from "../empty-state";
import { brDate, InputCell } from "../form-cells";
import { Footnote, Group, Section, SectionHeader } from "../grouped-list";
import { Backdrop } from "../overlays";
import { HeaderAddButton, PushPage } from "../push-page";
import { useShell } from "../shell/shell-context";
import { Sheet } from "../sheets/sheet";

const subscribeNever = () => () => undefined;

const lastUse = (key: ApiKey) => (key.lastUsedAt ? `Último uso ${brDate(key.lastUsedAt.slice(0, 10))} às ${brTime(key.lastUsedAt)}` : "Nunca usada");

export function IntegrationsScreen() {
  const shell = useShell();
  const { data, isLoading } = useApiKeys();
  const revoke = useRevokeApiKey();
  const [sheet, setSheet] = useState<{ key: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const origin = useSyncExternalStore(subscribeNever, () => window.location.origin, () => "");
  const endpoint = `${origin}${FUEL_ENDPOINT}`;

  const openSheet = () => {
    setSheet({ key: Date.now() });
    setOpen(true);
  };

  return (
    <PushPage title="Integrações" backHref="/profile" trailing={<HeaderAddButton label="Nova chave" onClick={openSheet} />}>
      {created && (
        <Section header={<SectionHeader>Chave criada</SectionHeader>} footer={<Footnote>Copie agora: por segurança ela não aparece de novo.</Footnote>}>
          <Group className="mx-4">
            <div className="px-4 py-3 font-mono text-[14px] break-all text-ios-label">{created}</div>
            <button
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(created).then(
                  () => shell.toast("Chave copiada."),
                  () => shell.toast("Não foi possível copiar. Selecione o texto."),
                )
              }
              className="h-11 w-full cursor-pointer border-0 border-t-[0.5px] border-ios-sep bg-transparent text-[17px] text-ios-tint active:bg-ios-fill"
            >
              Copiar chave
            </button>
          </Group>
        </Section>
      )}

      <Section
        header={<SectionHeader>Chaves de API</SectionHeader>}
        footer={<Footnote>Cada chave permite que outro app lance abastecimentos na sua conta. Toque numa chave para revogá-la.</Footnote>}
      >
        {isLoading && <div className="mx-4 h-[92px] animate-pulse rounded-xl bg-ios-cell" />}
        {data?.length === 0 && (
          <div className="mx-4">
            <InlineEmpty>Nenhuma chave. Toque em + para criar a primeira.</InlineEmpty>
          </div>
        )}
        {!!data?.length && (
          <Group className="mx-4">
            {data.map((key) => (
              <button
                key={key.id}
                type="button"
                onClick={() =>
                  shell.confirm({
                    message: `Revogar "${key.name}"? Os apps que usam esta chave param de enviar gastos.`,
                    label: "Revogar chave",
                    onConfirm: () =>
                      revoke.mutateAsync(key.id).then(
                        () => shell.toast("Chave revogada."),
                        (failure) => shell.toast(errorMessage(failure)),
                      ),
                  })
                }
                className="block w-full cursor-pointer border-0 border-b-[0.5px] border-ios-sep bg-transparent px-4 py-2.5 text-left text-ios-label last:border-b-0 active:bg-ios-fill"
              >
                <div className="text-[17px]">{key.name}</div>
                <div className="text-[13px] text-ios-label2">
                  {key.prefix}… · {lastUse(key)}
                </div>
              </button>
            ))}
          </Group>
        )}
      </Section>

      <Section header={<SectionHeader>Como enviar um abastecimento</SectionHeader>}>
        <Group className="mx-4">
          <pre className="m-0 overflow-x-auto px-4 py-3 font-mono text-[12px] leading-relaxed whitespace-pre text-ios-label2">{`POST ${endpoint}
X-Api-Key: <sua chave>
Content-Type: application/json

{
  "establishment": "Posto Shell Barra",
  "amount": 189.90,
  "occurredAt": "2026-11-01T14:32:00-03:00",
  "plate": "RIO2A18",
  "liters": 32.5,
  "externalId": "nota-123"
}`}</pre>
        </Group>
      </Section>

      {sheet && (
        <>
          <Backdrop open={open} onClose={() => setOpen(false)} />
          <NewKeySheet
            key={sheet.key}
            open={open}
            onClose={() => setOpen(false)}
            onCreated={(key) => {
              setOpen(false);
              setCreated(key);
            }}
          />
        </>
      )}
    </PushPage>
  );
}

function NewKeySheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (key: string) => void }) {
  const create = useCreateApiKey();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    if (create.isPending) return;
    if (name.trim().length < 2) return setError("Dê um nome para a chave.");
    try {
      onCreated((await create.mutateAsync(name.trim())).key);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  return (
    <Sheet open={open} title="Nova chave" saveLabel={create.isPending ? "Criando…" : "Criar"} canSave={!create.isPending} onSave={submit} onCancel={onClose}>
      {error && (
        <div role="alert" className="text-center text-sm text-danger">
          {error}
        </div>
      )}
      <Section footer={<Footnote>Use um nome que lembre o app que vai usar a chave.</Footnote>}>
        <Group className="mx-4 text-[17px]">
          <InputCell
            label="Nome"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            maxLength={60}
            placeholder="Ex.: App de abastecimento"
          />
        </Group>
      </Section>
    </Sheet>
  );
}
