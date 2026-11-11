"use client";

import { formatPlate, isValidPlate } from "@monitoring-car/shared";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authApi, sentVia, type CodeSent } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
import { LinkButton, PrimaryButton } from "../buttons";
import { Group } from "../grouped-list";
import { PinInput } from "../pin-input";
import { Icon } from "../icon";
import { PlateInput } from "../plate";
import { SegmentedControl } from "../segmented-control";
import { AppLogo } from "./app-logo";
import { AuthScreen } from "./auth-layout";
import { FieldRow } from "./field-row";
import { FormError } from "./form-error";
import { resendLabel, useCountdown } from "./use-countdown";

type Mode = "password" | "pin";

const PLATE_ERROR = "Placa inválida. Use ABC1D23 (Mercosul) ou ABC1234.";

export function LoginScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const countdown = useCountdown();
  const [mode, setMode] = useState<Mode>("password");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [plate, setPlate] = useState("");
  const [sent, setSent] = useState<CodeSent | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  const enter = () => {
    queryClient.clear();
    router.replace("/");
    router.refresh();
  };

  const submitPassword = () => {
    if (!login.trim()) return setError("Informe seu e-mail ou CPF.");
    if (!password) return setError("Informe sua senha.");
    run(async () => {
      await authApi.login(login.trim(), password);
      enter();
    });
  };

  const sendCode = () => {
    if (!isValidPlate(plate)) return setError(PLATE_ERROR);
    run(async () => {
      const result = await authApi.requestPin(plate);
      setSent(result);
      setPin("");
      countdown.start(result.resendIn);
    });
  };

  const verifyCode = () => {
    if (pin.length < 6) return setError("Digite os 6 dígitos do código.");
    run(async () => {
      try {
        await authApi.verifyPin(plate, pin);
        enter();
      } catch (failure) {
        setPin("");
        throw failure;
      }
    });
  };

  return (
    <AuthScreen>
      <AppLogo />

      <SegmentedControl
        tone="translucent"
        options={[
          { value: "password", label: "E-mail e senha" },
          { value: "pin", label: "Placa + PIN" },
        ]}
        value={mode}
        onChange={(next) => {
          setMode(next);
          setError("");
        }}
      />

      {mode === "password" && (
        <form
          className="flex flex-col gap-3.5"
          onSubmit={(event) => {
            event.preventDefault();
            submitPassword();
          }}
        >
          <Group>
            <FieldRow
              label="E-mail"
              value={login}
              onChange={(event) => {
                setLogin(event.target.value);
                setError("");
              }}
              placeholder="E-mail ou CPF"
              maxLength={254}
              autoComplete="username"
              autoCapitalize="none"
              inputMode="email"
            />
            <FieldRow
              label="Senha"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              placeholder="Senha"
              maxLength={128}
              autoComplete="current-password"
              trailing={
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  className="-mr-1.5 grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-ios-label2 active:opacity-50"
                >
                  <Icon name={showPassword ? "eye-off" : "eye"} size={20} />
                </button>
              }
            />
          </Group>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </PrimaryButton>
          <Link href="/forgot-password" className="self-center p-2 text-[15px] text-ios-tint no-underline active:opacity-50">
            Esqueci minha senha
          </Link>
        </form>
      )}

      {mode === "pin" && !sent && (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col items-center">
            <PlateInput
              value={plate}
              onChange={(value) => {
                setPlate(value);
                setError("");
              }}
              fontSize={44}
              maxWidth={280}
            />
          </div>
          <div className="px-4 text-center text-[15px] text-pretty text-ios-label2">
            Enviaremos um PIN de 6 dígitos para o e-mail da conta ligada a esta placa.
          </div>
          <PrimaryButton onClick={sendCode} disabled={busy}>
            {busy ? "Enviando…" : "Enviar PIN"}
          </PrimaryButton>
        </div>
      )}

      {mode === "pin" && sent && (
        <div className="flex flex-col gap-4">
          <div className="text-center text-[15px] leading-[1.45] text-pretty text-ios-label2">
            Enviamos o PIN {sentVia(sent)}, cadastrado na placa {formatPlate(plate)}.
          </div>
          <PinInput
            value={pin}
            onChange={(value) => {
              setPin(value);
              setError("");
            }}
          />
          <PrimaryButton onClick={verifyCode} disabled={busy}>
            {busy ? "Verificando…" : "Entrar"}
          </PrimaryButton>
          <div className="flex justify-between">
            <LinkButton
              onClick={() => {
                setSent(null);
                setPin("");
                setError("");
              }}
              className="px-1 py-2"
            >
              Trocar placa
            </LinkButton>
            <LinkButton
              onClick={() => countdown.seconds === 0 && sendCode()}
              className="px-1 py-2 tabular-nums"
              style={{ color: countdown.seconds > 0 ? "var(--ios-label3)" : "var(--ios-tint)" }}
            >
              {resendLabel(countdown.seconds)}
            </LinkButton>
          </div>
        </div>
      )}

      <FormError message={error} />

      <div className="text-center text-[15px] text-ios-label2">
        Não tem conta?{" "}
        <Link href="/signup" className="p-1 font-semibold text-ios-tint no-underline active:opacity-50">
          Criar conta
        </Link>
      </div>
    </AuthScreen>
  );
}
