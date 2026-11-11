"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authApi } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
import { LinkButton, PrimaryButton } from "../buttons";
import { Icon } from "../icon";
import { Group } from "../grouped-list";
import { AuthScreen, StepIntro } from "./auth-layout";
import { FieldRow } from "./field-row";
import { FormError } from "./form-error";

export function ForgotPasswordScreen() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!login.trim()) return setError("Informe seu e-mail ou CPF.");
    setBusy(true);
    setError("");
    try {
      await authApi.forgotPassword(login.trim());
      setSent(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen header={{ title: "Redefinir senha", onBack: () => router.push("/login") }}>
      {sent ? (
        <div className="flex flex-col items-center gap-4 pt-6 text-center">
          <span className="grid size-[68px] place-items-center rounded-full bg-ios-tintbg text-ios-tint">
            <Icon name="mail-check" size={30} />
          </span>
          <h1 className="text-[24px] font-bold tracking-[-.02em]">Confira seu e-mail</h1>
          <p className="text-[15px] text-pretty text-ios-label2">Se houver uma conta com esses dados, enviamos um link para o e-mail cadastrado. Ele vale por 30 minutos.</p>
          <LinkButton onClick={() => router.push("/login")} className="p-2">
            Voltar para Entrar
          </LinkButton>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3.5"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <StepIntro title="Esqueceu a senha?">Digite o e-mail ou CPF da conta. Enviaremos um link para você criar uma nova senha.</StepIntro>
          <Group>
            <FieldRow
              label="E-mail"
              value={login}
              onChange={(event) => {
                setLogin(event.target.value);
                setError("");
              }}
              placeholder="seu@email.com"
              maxLength={254}
              autoComplete="username"
              autoCapitalize="none"
            />
          </Group>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Enviando…" : "Enviar link"}
          </PrimaryButton>
          <FormError message={error} />
        </form>
      )}
    </AuthScreen>
  );
}
