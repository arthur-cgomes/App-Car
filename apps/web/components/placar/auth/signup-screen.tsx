"use client";

import {
  PASSWORD_HINT,
  PASSWORD_RULES_MESSAGE,
  formatBrPhoneInput,
  formatCpf,
  isStrongPassword,
  isValidCpf,
  isValidPlate,
  normalizeBrMobile,
} from "@monitoring-car/shared";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authApi } from "@/lib/api/auth";
import { api, errorMessage } from "@/lib/api/client";
import { LinkButton, PrimaryButton } from "../buttons";
import { Footnote, Group } from "../grouped-list";
import { PinInput } from "../pin-input";
import { PlateInput } from "../plate";
import { Switch } from "../switch";
import { AuthScreen, StepIntro } from "./auth-layout";
import { FieldRow } from "./field-row";
import { FormError } from "./form-error";
import { resendLabel, useCountdown } from "./use-countdown";

type Step = "data" | "password" | "email" | "vehicle";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function SignupScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const countdown = useCountdown();
  const [step, setStep] = useState<Step>("data");
  const [form, setForm] = useState({ name: "", email: "", cpf: "", phone: "", password: "", confirm: "" });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [plate, setPlate] = useState("");
  const [odometer, setOdometer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const goHome = () => {
    queryClient.clear();
    router.replace("/");
    router.refresh();
  };

  const submitData = () => {
    if (form.name.trim().length < 2) return setError("Informe seu nome.");
    if (!EMAIL_PATTERN.test(form.email.trim())) return setError("E-mail inválido.");
    if (form.cpf && !isValidCpf(form.cpf)) return setError("CPF inválido.");
    if (form.phone.trim() && !normalizeBrMobile(form.phone)) return setError("Celular incompleto.");
    setStep("password");
  };

  const submitPassword = () => {
    if (!isStrongPassword(form.password)) return setError(PASSWORD_RULES_MESSAGE);
    if (form.password !== form.confirm) return setError("As senhas não conferem.");
    if (!acceptTerms) return setError("Aceite os Termos de uso e a Política de privacidade.");
    run(async () => {
      const created = await authApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        cpf: form.cpf || undefined,
        phone: form.phone.trim() || undefined,
        password: form.password,
        acceptTerms,
      });
      setSentTo(created.sentTo);
      countdown.start(created.resendIn);
      setStep("email");
    });
  };

  const submitCode = () => {
    if (code.length < 6) return setError("Digite os 6 dígitos do código.");
    run(async () => {
      try {
        await authApi.verifyEmail(code);
        setStep("vehicle");
      } catch (failure) {
        setCode("");
        throw failure;
      }
    });
  };

  const resend = () =>
    countdown.seconds === 0 &&
    run(async () => {
      const sent = await authApi.sendEmailCode();
      countdown.start(sent.resendIn);
    });

  const submitVehicle = () => {
    if (!isValidPlate(plate)) return setError("Placa inválida. Use ABC1D23 ou ABC1234.");
    run(async () => {
      await api("/vehicles", {
        body: { plate, currentOdometer: Number.parseInt(odometer.replace(/\D/g, ""), 10) || 0 },
      });
      goHome();
    });
  };

  const back =
    step === "data"
      ? () => router.push("/entrar")
      : step === "password"
        ? () => {
            setError("");
            setStep("data");
          }
        : undefined;

  return (
    <AuthScreen header={back ? { title: "Criar conta", onBack: back } : undefined}>
      {step === "data" && (
        <form
          className="flex flex-col gap-3.5"
          onSubmit={(event) => {
            event.preventDefault();
            submitData();
          }}
        >
          <StepIntro title="Seus dados">Passo 1 de 4</StepIntro>
          <Group>
            <FieldRow label="Nome" value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" maxLength={120} placeholder="Obrigatório" />
            <FieldRow
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              maxLength={254}
              placeholder="voce@email.com"
            />
            <FieldRow label="CPF" value={form.cpf} onChange={(e) => set("cpf", formatCpf(e.target.value))} inputMode="numeric" placeholder="Opcional" />
            <FieldRow
              label="Celular"
              value={form.phone}
              onChange={(e) => set("phone", formatBrPhoneInput(e.target.value))}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="Opcional"
            />
          </Group>
          <Footnote>Com o CPF você também pode entrar sem o e-mail. Com a placa, você entra com um PIN enviado ao seu e-mail.</Footnote>
          <PrimaryButton type="submit">Continuar</PrimaryButton>
        </form>
      )}

      {step === "password" && (
        <form
          className="flex flex-col gap-3.5"
          onSubmit={(event) => {
            event.preventDefault();
            submitPassword();
          }}
        >
          <StepIntro title="Crie uma senha">Passo 2 de 4 · {PASSWORD_HINT}</StepIntro>
          <Group>
            <FieldRow label="Senha" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" maxLength={128} placeholder="Obrigatória" />
            <FieldRow label="Confirmar" type="password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} autoComplete="new-password" maxLength={128} placeholder="Repita a senha" />
          </Group>
          <Group>
            <div className="flex min-h-[50px] items-center gap-3 px-4 py-2">
              <span className="flex-1 text-[15px] leading-snug">Li e aceito os Termos de uso e a Política de privacidade</span>
              <Switch
                checked={acceptTerms}
                onChange={(checked) => {
                  setAcceptTerms(checked);
                  setError("");
                }}
                label="Aceitar os Termos de uso e a Política de privacidade"
              />
            </div>
          </Group>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Criando conta…" : "Criar conta"}
          </PrimaryButton>
        </form>
      )}

      {step === "email" && (
        <div className="flex flex-col gap-4">
          <StepIntro title="Confirme seu e-mail">Passo 3 de 4 · enviamos um código para {sentTo}.</StepIntro>
          <PinInput
            value={code}
            onChange={(value) => {
              setCode(value);
              setError("");
            }}
          />
          <PrimaryButton onClick={submitCode} disabled={busy}>
            {busy ? "Verificando…" : "Confirmar"}
          </PrimaryButton>
          <LinkButton
            onClick={resend}
            className="self-end px-1 py-2 tabular-nums"
            style={{ color: countdown.seconds > 0 ? "var(--ios-label3)" : "var(--ios-tint)" }}
          >
            {resendLabel(countdown.seconds)}
          </LinkButton>
        </div>
      )}

      {step === "vehicle" && (
        <div className="flex flex-col gap-3.5">
          <StepIntro title="Seu carro">Passo 4 de 4 · com a placa você também entra com um PIN.</StepIntro>
          <div className="flex flex-col items-center gap-3.5 rounded-2xl bg-ios-cell px-4 py-[18px]">
            <PlateInput
              value={plate}
              onChange={(value) => {
                setPlate(value);
                setError("");
              }}
              label="Placa do veículo"
            />
          </div>
          <Group>
            <FieldRow label="Odômetro" labelWidth={120} value={odometer} onChange={(e) => setOdometer(e.target.value)} inputMode="numeric" placeholder="km" className="text-right" />
          </Group>
          <PrimaryButton onClick={submitVehicle} disabled={busy}>
            {busy ? "Adicionando…" : "Adicionar veículo"}
          </PrimaryButton>
          <LinkButton onClick={goHome} className="self-center p-2">
            Pular por enquanto
          </LinkButton>
        </div>
      )}

      <FormError message={error} />

      {step === "data" && (
        <div className="mt-auto text-center text-[15px] text-ios-label2">
          Já tem conta?{" "}
          <Link href="/entrar" className="p-1 font-semibold text-ios-tint no-underline active:opacity-50">
            Entrar
          </Link>
        </div>
      )}
    </AuthScreen>
  );
}
