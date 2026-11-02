"use client";

import {
  PASSWORD_HINT,
  PASSWORD_RULES_MESSAGE,
  formatBrPhoneInput,
  formatCpf,
  isStrongPassword,
  isValidCpf,
  normalizeBrMobile,
} from "@monitoring-car/shared";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authApi } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
import { LinkButton, PrimaryButton } from "../buttons";
import { Footnote, Group } from "../grouped-list";
import { PinInput } from "../pin-input";
import { Switch } from "../switch";
import { AuthScreen, StepIntro } from "./auth-layout";
import { FieldRow } from "./field-row";
import { FormError } from "./form-error";
import { resendLabel, useCountdown } from "./use-countdown";

type Step = "email" | "code" | "data" | "password" | "vehicle";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const PREVIOUS: Partial<Record<Step, Step>> = { code: "email", data: "code", password: "data" };

export function SignupScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const countdown = useCountdown();
  const [step, setStep] = useState<Step>("email");
  const [form, setForm] = useState({ name: "", email: "", cpf: "", phone: "", password: "", confirm: "" });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [signupToken, setSignupToken] = useState("");
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

  const goHome = (target = "/") => {
    queryClient.clear();
    router.replace(target);
    router.refresh();
  };

  const sendCode = () =>
    run(async () => {
      const sent = await authApi.signupStart(form.email.trim());
      setSentTo(sent.sentTo);
      setCode("");
      countdown.start(sent.resendIn);
      setStep("code");
    });

  const submitEmail = () => {
    if (!EMAIL_PATTERN.test(form.email.trim())) return setError("E-mail inválido.");
    sendCode();
  };

  const submitCode = () => {
    if (code.length < 6) return setError("Digite os 6 dígitos do código.");
    run(async () => {
      try {
        setSignupToken((await authApi.signupVerify(form.email.trim(), code)).signupToken);
        setStep("data");
      } catch (failure) {
        setCode("");
        throw failure;
      }
    });
  };

  const submitData = () => {
    if (form.name.trim().length < 2) return setError("Informe seu nome.");
    if (!form.cpf.trim()) return setError("Informe seu CPF.");
    if (!isValidCpf(form.cpf)) return setError("CPF inválido.");
    if (!form.phone.trim()) return setError("Informe seu celular.");
    if (!normalizeBrMobile(form.phone)) return setError("Celular incompleto.");
    setStep("password");
  };

  const submitPassword = () => {
    if (!isStrongPassword(form.password)) return setError(PASSWORD_RULES_MESSAGE);
    if (form.password !== form.confirm) return setError("As senhas não conferem.");
    if (!acceptTerms) return setError("Aceite os Termos de uso e a Política de privacidade.");
    run(async () => {
      await authApi.register({
        signupToken,
        name: form.name.trim(),
        cpf: form.cpf,
        phone: form.phone,
        password: form.password,
        acceptTerms,
      });
      setStep("vehicle");
    });
  };

  const back =
    step === "email"
      ? () => router.push("/login")
      : PREVIOUS[step]
        ? () => {
            setError("");
            setStep(PREVIOUS[step]!);
          }
        : undefined;

  return (
    <AuthScreen header={back ? { title: "Criar conta", onBack: back } : undefined}>
      {step === "email" && (
        <form
          className="flex flex-col gap-3.5"
          onSubmit={(event) => {
            event.preventDefault();
            submitEmail();
          }}
        >
          <StepIntro title="Seu e-mail">Passo 1 de 5 · enviaremos um código para confirmar que o e-mail é seu.</StepIntro>
          <Group>
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
          </Group>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Enviando…" : "Enviar código"}
          </PrimaryButton>
        </form>
      )}

      {step === "code" && (
        <div className="flex flex-col gap-4">
          <StepIntro title="Confirme seu e-mail">Passo 2 de 5 · enviamos um código para {sentTo}.</StepIntro>
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
            onClick={() => countdown.seconds === 0 && sendCode()}
            className="self-end px-1 py-2 tabular-nums"
            style={{ color: countdown.seconds > 0 ? "var(--ios-label3)" : "var(--ios-tint)" }}
          >
            {resendLabel(countdown.seconds)}
          </LinkButton>
        </div>
      )}

      {step === "data" && (
        <form
          className="flex flex-col gap-3.5"
          onSubmit={(event) => {
            event.preventDefault();
            submitData();
          }}
        >
          <StepIntro title="Seus dados">Passo 3 de 5 · e-mail {form.email.trim()} confirmado.</StepIntro>
          <Group>
            <FieldRow label="Nome" value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" maxLength={120} placeholder="Obrigatório" />
            <FieldRow label="CPF" value={form.cpf} onChange={(e) => set("cpf", formatCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" />
            <FieldRow
              label="Celular"
              value={form.phone}
              onChange={(e) => set("phone", formatBrPhoneInput(e.target.value))}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(00) 00000-0000"
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
          <StepIntro title="Crie uma senha">Passo 4 de 5 · {PASSWORD_HINT}</StepIntro>
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

      {step === "vehicle" && (
        <div className="flex flex-col gap-3.5">
          <StepIntro title="Seu carro">
            Passo 5 de 5 · conta criada! Cadastre seu veículo com a placa e os dados do documento: marca, modelo, versão, cor, km e data da compra.
          </StepIntro>
          <PrimaryButton onClick={() => goHome("/?add=vehicle")}>Cadastrar veículo</PrimaryButton>
          <LinkButton onClick={() => goHome()} className="self-center p-2">
            Pular por enquanto
          </LinkButton>
        </div>
      )}

      <FormError message={error} />

      {step === "email" && (
        <div className="mt-auto text-center text-[15px] text-ios-label2">
          Já tem conta?{" "}
          <Link href="/login" className="p-1 font-semibold text-ios-tint no-underline active:opacity-50">
            Entrar
          </Link>
        </div>
      )}
    </AuthScreen>
  );
}
