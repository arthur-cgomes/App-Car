"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authApi } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
import { PrimaryButton } from "../buttons";
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
    <AuthScreen header={{ title: "Esqueci minha senha", onBack: () => router.push("/entrar") }}>
      {sent ? (
        <div className="flex flex-col gap-4">
          <StepIntro title="Confira seu e-mail">
            Se houver uma conta com esses dados, enviamos um link para o e-mail cadastrado. O link vale por 30 minutos.
          </StepIntro>
          <PrimaryButton onClick={() => router.push("/entrar")}>Voltar para o login</PrimaryButton>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3.5"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <StepIntro title="Redefinir senha">Informe seu e-mail ou CPF. Enviaremos um link para criar uma nova senha.</StepIntro>
          <Group>
            <FieldRow
              label="E-mail"
              labelWidth={62}
              value={login}
              onChange={(event) => {
                setLogin(event.target.value);
                setError("");
              }}
              placeholder="voce@email.com ou CPF"
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
