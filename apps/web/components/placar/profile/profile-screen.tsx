"use client";

import Link from "next/link";
import { PASSWORD_RULES_MESSAGE, formatBrPhone, formatBrPhoneInput, formatCpf, isStrongPassword, isValidCpf, normalizeBrMobile, normalizeCpf } from "@monitoring-car/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EXPORT_URL, accountApi, authApi, sentVia, useMe, type CodeSent, type Me } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
import { uploadFile } from "@/lib/api/expenses";
import { useActivateVehicle, useActiveVehicle, vehicleName } from "@/lib/api/vehicles";
import { applyTheme } from "@/lib/theme";
import { FieldRow } from "../auth/field-row";
import { PasswordRules } from "../auth/password-rules";
import { Avatar } from "../avatar";
import { GlassTextButton } from "../buttons";
import { Footnote, Group, Section, SectionHeader } from "../grouped-list";
import { Icon } from "../icon";
import { Backdrop } from "../overlays";
import { PlateBadge } from "../plate";
import { PushPage } from "../push-page";
import { SegmentedControl } from "../segmented-control";
import { useShell } from "../shell/shell-context";
import { CodeSheet } from "../sheets/code-sheet";
import { Sheet } from "../sheets/sheet";
import { Switch } from "../switch";

interface Draft {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  avatarFileId: string | null;
}

const draftOf = (me: Me): Draft => ({
  name: me.name,
  email: me.email,
  phone: me.phone ? formatBrPhone(me.phone) : "",
  cpf: me.cpf ? formatCpf(me.cpf) : "",
  avatarFileId: me.avatarFileId,
});

const ROW = "flex min-h-[46px] items-center gap-3 border-b-[0.5px] border-ios-sep px-4 last:border-b-0";

type CodeFlow = { kind: "phone" | "delete" | "email"; sent: CodeSent; key: number } | null;

export function ProfileScreen() {
  const me = useMe();
  if (!me.data) return <PushPage title="Perfil" backHref="/">{null}</PushPage>;
  return <ProfileForm key={me.data.id} me={me.data} />;
}

function ProfileForm({ me }: { me: Me }) {
  const shell = useShell();
  const client = useQueryClient();
  const { vehicle: active, vehicles } = useActiveVehicle();
  const activate = useActivateVehicle();
  const [draft, setDraft] = useState<Draft>(() => draftOf(me));
  const [saved, setSaved] = useState<Draft>(() => draftOf(me));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [codeFlow, setCodeFlow] = useState<CodeFlow>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [changePassword, setChangePassword] = useState<{ key: number; open: boolean } | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const set = (key: keyof Draft, value: string | null) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  };
  const refresh = () => client.invalidateQueries({ queryKey: ["me"] });
  const openCode = (kind: "phone" | "delete" | "email", sent: CodeSent) => {
    setCodeFlow({ kind, sent, key: Date.now() });
    setCodeOpen(true);
  };

  const save = async () => {
    if (!dirty || busy) return;
    if (!draft.name.trim()) return setError("Informe seu nome.");
    if (!/^\S+@\S+\.\S+$/.test(draft.email.trim())) return setError("E-mail inválido.");
    const phone = draft.phone.trim() ? normalizeBrMobile(draft.phone) : me.phone;
    if (draft.phone.trim() && !phone) return setError("Celular incompleto.");
    if (draft.cpf && !isValidCpf(draft.cpf)) return setError("CPF inválido.");
    setBusy(true);
    try {
      await accountApi.update({
        name: draft.name.trim(),
        email: draft.email.trim(),
        cpf: draft.cpf ? normalizeCpf(draft.cpf) : null,
        avatarFileId: draft.avatarFileId,
      });
      const phoneChanged = !!phone && phone !== me.phone;
      const result = phoneChanged ? await accountApi.requestPhoneChange(phone) : null;
      if (result && !result.saved) {
        setSaved({ ...draft, phone: saved.phone });
        openCode("phone", result);
      } else {
        setSaved(draft);
      }
      await refresh();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const pickAvatar = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      set("avatarFileId", await uploadFile(file));
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setUploading(false);
    }
  };

  const preference = async (body: Partial<Pick<Me, "theme" | "pinLoginEnabled" | "pinChannel">>) => {
    client.setQueryData<Me>(["me"], (current) => current && { ...current, ...body });
    try {
      await accountApi.update(body);
    } catch (failure) {
      shell.alert(errorMessage(failure));
    }
    await refresh();
  };

  const leave = () => {
    client.clear();
    window.location.replace("/login");
  };

  const askDeletion = () =>
    shell.confirm({
      message: "Excluir sua conta? Veículos, gastos e lembretes deixam de aparecer agora e são apagados de vez em 30 dias.",
      label: "Excluir conta",
      onConfirm: async () => {
        try {
          const how = await accountApi.requestDeletion();
          if (how.method === "code") openCode("delete", how);
          else setPasswordOpen(true);
        } catch (failure) {
          shell.alert(errorMessage(failure));
        }
      },
    });

  return (
    <PushPage
      title="Perfil"
      backHref="/"
      trailing={
        <GlassTextButton onClick={save} disabled={!dirty || busy}>
          {busy ? "Salvando…" : "Salvar"}
        </GlassTextButton>
      }
    >
      <div className="flex flex-col items-center gap-2">
        <label className="relative cursor-pointer active:opacity-70">
          <Avatar name={draft.name} fileId={draft.avatarFileId} size={84} />
          <span className="absolute -right-1 -bottom-0.5 grid size-8 place-items-center rounded-full border-[3px] border-ios-bg bg-ios-cell2 text-ios-label">
            <Icon name="camera" size={16} />
          </span>
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => pickAvatar(event.currentTarget.files?.[0])} />
        </label>
        <div className="mt-1 text-[22px] font-bold">{me.name}</div>
        <div className="-mt-1.5 text-[15px] text-ios-label2">{me.email}</div>
        {uploading && <div className="text-[13px] text-ios-label2">Enviando foto…</div>}
        {draft.avatarFileId && !uploading && (
          <button type="button" onClick={() => set("avatarFileId", null)} className="cursor-pointer border-0 bg-transparent text-[15px] text-ios-tint active:opacity-50">
            Remover foto
          </button>
        )}
      </div>

      <Section
        header={<SectionHeader>Dados pessoais</SectionHeader>}
        footer={
          <>
            {error && (
              <div role="alert" className="px-8 text-[13px] text-danger-soft">
                {error}
              </div>
            )}
            <Footnote>O CPF não pode ser alterado. E-mail e celular novos são confirmados por código.</Footnote>
          </>
        }
      >
        <Group className="mx-4 text-[17px]">
          {(
            [
              ["Nome", "name", { autoComplete: "name", maxLength: 120 }, null],
              ["CPF", "cpf", { inputMode: "numeric", placeholder: "Opcional", readOnly: !!me.cpf }, null],
              ["E-mail", "email", { type: "email", autoComplete: "email", autoCapitalize: "none", maxLength: 254 }, me.emailVerifiedAt ? "ok" : "todo"],
              ["Celular", "phone", { inputMode: "tel", autoComplete: "tel-national" }, me.phoneVerifiedAt ? "ok" : "todo"],
            ] as const
          ).map(([label, key, props, badge]) => (
            <label key={key} className={ROW}>
              <span className="w-[66px] flex-none">{label}</span>
              <input
                {...props}
                value={draft[key] ?? ""}
                onChange={(event) =>
                  set(key, key === "phone" ? formatBrPhoneInput(event.target.value) : key === "cpf" ? formatCpf(event.target.value) : event.target.value)
                }
                className="min-w-0 flex-1 border-0 bg-transparent text-right text-[17px] text-ios-label2 outline-0"
              />
              {badge && (
                <span className="flex-none rounded-lg px-2 py-0.5 text-xs font-semibold" style={badge === "ok" ? { color: "var(--green)", background: "color-mix(in srgb, var(--green) 16%, transparent)" } : { color: "var(--ios-tint)", background: "var(--ios-tintbg)" }}>
                  {badge === "ok" ? "Confirmado" : "Confirmar"}
                </span>
              )}
            </label>
          ))}
        </Group>
      </Section>

      <Section header={<SectionHeader>Meus veículos</SectionHeader>}>
        <Group className="mx-4">
          {vehicles.map((vehicle) => (
            <button
              key={vehicle.id}
              type="button"
              onClick={() => vehicle.id !== active?.id && activate.mutate(vehicle.id)}
              className="group/row flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent py-0 pr-0 pl-4 text-left text-ios-label active:bg-ios-fill"
            >
              <PlateBadge plate={vehicle.plate} size="sm" />
              <div className="flex min-w-0 flex-1 items-center gap-2 border-b-[0.5px] border-ios-sep py-2.5 pr-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[17px]">{vehicleName(vehicle)}</div>
                  <div className="text-sm text-ios-label2">{[vehicle.modelVersion, vehicle.yearModel].filter(Boolean).join(" · ")}</div>
                </div>
                <span className="text-ios-tint" style={{ opacity: vehicle.id === active?.id ? 1 : 0 }}>
                  <Icon name="check" size={18} />
                </span>
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={shell.openVehicleSheet}
            className="flex min-h-[46px] w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 text-[17px] text-ios-tint active:bg-ios-fill"
          >
            <Icon name="circle-plus" />
            Adicionar veículo
          </button>
        </Group>
      </Section>

      <Section header={<SectionHeader>Aparência</SectionHeader>}>
        <Group className="mx-4 px-4 py-2.5">
          <SegmentedControl
            options={[
              { value: "DARK", label: "Escuro" },
              { value: "LIGHT", label: "Claro" },
            ]}
            value={me.theme}
            onChange={(theme) => {
              applyTheme(theme === "LIGHT" ? "light" : "dark");
              preference({ theme });
            }}
          />
        </Group>
      </Section>

      <Section
        header={<SectionHeader>Segurança</SectionHeader>}
        footer={
          <Footnote>
            {!me.emailVerifiedAt
              ? "Confirme seu e-mail para entrar com a placa e um PIN."
              : me.smsAvailable
                ? "O PIN de acesso pela placa chega pelo canal escolhido."
                : "O PIN por SMS chega em breve; por enquanto ele é enviado por e-mail."}
          </Footnote>
        }
      >
        <Group className="mx-4 text-[17px]">
          <div className={ROW}>
            <span className="flex-1">Entrar com placa + PIN</span>
            <Switch checked={me.pinLoginEnabled} onChange={(on) => preference({ pinLoginEnabled: on })} label="Entrar com placa e PIN" />
          </div>
          <div className={`${ROW} gap-3`}>
            <span className="flex-1">Receber o PIN por</span>
            <div className="w-[150px] flex-none">
              <SegmentedControl
                options={[
                  { value: "EMAIL", label: "E-mail" },
                  { value: "SMS", label: "SMS", disabled: !me.smsAvailable || !me.phoneVerifiedAt },
                ]}
                value={me.pinChannel}
                onChange={(pinChannel) => preference({ pinChannel })}
              />
            </div>
          </div>
          {!me.emailVerifiedAt && (
            <button
              type="button"
              onClick={() =>
                authApi
                  .sendEmailCode()
                  .then((sent) => openCode("email", sent))
                  .catch((failure) => shell.alert(errorMessage(failure)))
              }
              className={`${ROW} w-full cursor-pointer border-x-0 border-t-0 bg-transparent text-left text-[17px] text-ios-tint active:bg-ios-fill`}
            >
              <span className="flex-1">Confirmar e-mail</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setChangePassword({ key: Date.now(), open: true })}
            className={`${ROW} w-full cursor-pointer border-x-0 border-t-0 bg-transparent text-left text-[17px] text-ios-label active:bg-ios-fill`}
          >
            <span className="flex-1">Alterar senha</span>
            <span className="text-ios-label3">
              <Icon name="right" />
            </span>
          </button>
        </Group>
      </Section>

      <Section header={<SectionHeader>Integrações</SectionHeader>} footer={<Footnote>Chaves de API para automatizar lançamentos.</Footnote>}>
        <Group className="mx-4 text-[17px]">
          <Link href="/profile/integrations" className={`${ROW} text-ios-label no-underline active:bg-ios-fill`}>
            <span className="flex-1">Chaves de API</span>
            <span className="text-ios-label3">
              <Icon name="right" />
            </span>
          </Link>
        </Group>
      </Section>

      <Section header={<SectionHeader>Privacidade</SectionHeader>} footer={<Footnote>A exclusão é imediata para você; os dados são apagados de vez em 30 dias.</Footnote>}>
        <Group className="mx-4 text-[17px]">
          <a href={EXPORT_URL} download className={`${ROW} text-ios-label no-underline active:bg-ios-fill`}>
            <span className="flex-1">Exportar meus dados</span>
            <span className="text-ios-label3">
              <Icon name="download" />
            </span>
          </a>
          <button type="button" onClick={askDeletion} className="h-[46px] w-full cursor-pointer border-0 bg-transparent text-left text-[17px] text-danger-soft active:bg-ios-fill">
            <span className="px-4">Excluir conta</span>
          </button>
        </Group>
      </Section>

      <Group className="mx-4">
        <button
          type="button"
          onClick={() =>
            shell.confirm({
              title: "Sair da conta?",
              message: "Você vai precisar entrar de novo neste aparelho.",
              label: "Sair",
              onConfirm: () =>
                authApi
                  .logout()
                  .then(leave)
                  .catch((failure) => shell.alert(errorMessage(failure))),
            })
          }
          className="h-[46px] w-full cursor-pointer border-0 bg-transparent text-[17px] text-danger-soft active:bg-ios-fill"
        >
          Sair da conta
        </button>
      </Group>

      {codeFlow && (
        <>
          <Backdrop open={codeOpen} onClose={() => setCodeOpen(false)} />
          <CodeSheet
            key={codeFlow.key}
            open={codeOpen}
            title={codeFlow.kind === "phone" ? "Confirmar celular" : codeFlow.kind === "email" ? "Confirmar e-mail" : "Excluir conta"}
            confirmLabel={codeFlow.kind === "delete" ? "Excluir" : "Confirmar"}
            intro={`Enviamos um código ${sentVia(codeFlow.sent)}.`}
            resendIn={codeFlow.sent.resendIn}
            onResend={async () => {
              const again =
                codeFlow.kind === "phone"
                  ? await accountApi.requestPhoneChange(normalizeBrMobile(draft.phone)!)
                  : codeFlow.kind === "email"
                    ? await authApi.sendEmailCode()
                    : await accountApi.requestDeletion();
              return "resendIn" in again ? again.resendIn : 0;
            }}
            onConfirm={async (code) => {
              if (codeFlow.kind === "email") {
                await authApi.verifyEmail(code);
                setCodeOpen(false);
                await refresh();
              } else if (codeFlow.kind === "phone") {
                await accountApi.confirmPhoneChange(code);
                setSaved((current) => ({ ...current, phone: draft.phone }));
                setCodeOpen(false);
                await refresh();
              } else {
                await accountApi.delete({ code });
                leave();
              }
            }}
            onCancel={() => setCodeOpen(false)}
          />
        </>
      )}

      {changePassword && (
        <>
          <Backdrop open={changePassword.open} onClose={() => setChangePassword({ ...changePassword, open: false })} />
          <ChangePasswordSheet key={changePassword.key} open={changePassword.open} onClose={() => setChangePassword({ ...changePassword, open: false })} />
        </>
      )}

      {passwordOpen && (
        <>
          <Backdrop open onClose={() => setPasswordOpen(false)} />
          <PasswordSheet onCancel={() => setPasswordOpen(false)} onConfirm={(password) => accountApi.delete({ password }).then(leave)} />
        </>
      )}
    </PushPage>
  );
}

function ChangePasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };
  const submit = async () => {
    if (!form.current) return setError("Informe a senha atual.");
    if (!isStrongPassword(form.next)) return setError(PASSWORD_RULES_MESSAGE);
    if (form.next !== form.confirm) return setError("As senhas não conferem.");
    setBusy(true);
    try {
      await accountApi.changePassword(form.current, form.next);
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} title="Alterar senha" saveLabel={busy ? "Salvando…" : "Salvar senha"} canSave={!busy} onSave={submit} onCancel={onClose}>
      <Group className="mx-4">
        <FieldRow label="Senha atual" type="password" value={form.current} onChange={(e) => set("current", e.target.value)} autoComplete="current-password" maxLength={128} />
      </Group>
      <Group className="mx-4">
        <FieldRow label="Nova senha" type="password" value={form.next} onChange={(e) => set("next", e.target.value)} autoComplete="new-password" maxLength={128} />
        <FieldRow label="Confirmar nova senha" type="password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} autoComplete="new-password" maxLength={128} />
      </Group>
      <PasswordRules password={form.next} />
      {error && (
        <div role="alert" className="text-center text-sm text-danger">
          {error}
        </div>
      )}
    </Sheet>
  );
}

function PasswordSheet({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet
      open
      title="Excluir conta"
      saveLabel={busy ? "Aguarde…" : "Excluir"}
      canSave={!busy && !!password}
      onCancel={onCancel}
      onSave={async () => {
        setBusy(true);
        try {
          await onConfirm(password);
        } catch (failure) {
          setError(errorMessage(failure));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="px-8 text-center text-[15px] text-ios-label2">Digite sua senha para confirmar.</div>
      <Group className="mx-4 text-[17px]">
        <label className={ROW}>
          <span className="flex-none">Senha</span>
          <input
            type="password"
            maxLength={128}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            autoComplete="current-password"
            className="min-w-0 flex-1 border-0 bg-transparent text-right text-[17px] text-ios-label outline-0"
          />
        </label>
      </Group>
      {error && (
        <div role="alert" className="text-center text-sm text-danger">
          {error}
        </div>
      )}
    </Sheet>
  );
}
