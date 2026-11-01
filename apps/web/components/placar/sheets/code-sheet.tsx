"use client";

import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { resendLabel, useCountdown } from "../auth/use-countdown";
import { LinkButton } from "../buttons";
import { PinInput } from "../pin-input";
import { Sheet } from "./sheet";

interface CodeSheetProps {
  open: boolean;
  title: string;
  intro: string;
  confirmLabel: string;
  resendIn: number;
  onConfirm: (code: string) => Promise<void>;
  onResend: () => Promise<number>;
  onCancel: () => void;
}

export function CodeSheet({ open, title, intro, confirmLabel, resendIn, onConfirm, onResend, onCancel }: CodeSheetProps) {
  const countdown = useCountdown(resendIn);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (code.length < 6) return setError("Digite os 6 dígitos do código.");
    setBusy(true);
    try {
      await onConfirm(code);
    } catch (failure) {
      setCode("");
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} title={title} saveLabel={busy ? "Aguarde…" : confirmLabel} canSave={!busy} onSave={submit} onCancel={onCancel}>
      <div className="flex flex-col gap-4 px-4">
        <div className="text-center text-[15px] leading-[1.45] text-pretty text-ios-label2">{intro}</div>
        <PinInput
          value={code}
          onChange={(value) => {
            setCode(value);
            setError("");
          }}
        />
        {error && (
          <div role="alert" className="text-center text-sm text-danger">
            {error}
          </div>
        )}
        <LinkButton
          onClick={async () => {
            if (countdown.seconds > 0) return;
            try {
              countdown.start(await onResend());
            } catch (failure) {
              setError(errorMessage(failure));
            }
          }}
          className="self-end px-1 py-2 tabular-nums"
          style={{ color: countdown.seconds > 0 ? "var(--ios-label3)" : "var(--ios-tint)" }}
        >
          {resendLabel(countdown.seconds)}
        </LinkButton>
      </div>
    </Sheet>
  );
}
