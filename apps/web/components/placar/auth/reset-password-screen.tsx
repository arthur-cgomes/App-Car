"use client";

import { PASSWORD_HINT, PASSWORD_RULES_MESSAGE, isStrongPassword } from "@monitoring-car/shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authApi } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
import { PrimaryButton } from "../buttons";
import { Group } from "../grouped-list";
import { AuthScreen, StepIntro } from "./auth-layout";
import { FieldRow } from "./field-row";
import { FormError } from "./form-error";

export function ResetPasswordScreen() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(token ? "" : "Link inválido. Peça um novo em \"Esqueci minha senha\".");

  const submit = async () => {
    if (!isStrongPassword(password)) return setError(PASSWORD_RULES_MESSAGE);
    if (password !== confirm) return setError("As senhas não conferem.");
    setBusy(true);
    setError("");
    try {
      await authApi.resetPassword(token, password);
      await authApi.logout().catch(() => undefined);
      setDone(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen header={{ title: "Nova senha", onBack: () => router.push("/login") }}>
      {done ? (
        <div className="flex flex-col gap-4">
          <StepIntro title="Senha alterada">Por segurança, encerramos as sessões abertas. Entre com a nova senha.</StepIntro>
          <PrimaryButton onClick={() => router.push("/login")}>Entrar</PrimaryButton>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3.5"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <StepIntro title="Crie uma nova senha">{PASSWORD_HINT}</StepIntro>
          <Group>
            <FieldRow label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" maxLength={128} placeholder="Obrigatória" />
            <FieldRow label="Confirmar" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" maxLength={128} placeholder="Repita a senha" />
          </Group>
          <PrimaryButton type="submit" disabled={busy || !token}>
            {busy ? "Salvando…" : "Salvar nova senha"}
          </PrimaryButton>
          <FormError message={error} />
        </form>
      )}
    </AuthScreen>
  );
}
