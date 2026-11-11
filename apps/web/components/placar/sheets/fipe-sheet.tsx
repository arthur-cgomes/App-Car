"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { fichaApi, type Fipe } from "@/lib/api/ficha";
import { formatMoneyInput, parseMoneyInput } from "@/lib/format";
import { LinkButton } from "../buttons";
import { centsToInput } from "../form-cells";
import { Sheet } from "./sheet";

export function FipeSheet({ open, vehicleId, fipe, onClose }: { open: boolean; vehicleId: string; fipe?: Fipe; onClose: () => void }) {
  const client = useQueryClient();
  const manual = fipe?.available && fipe.manual;
  const [value, setValue] = useState(fipe?.available ? centsToInput(fipe.valueCents) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (fipeValueCents: number | null) => {
    setBusy(true);
    try {
      await fichaApi.updateVehicle(vehicleId, { fipeValueCents });
      await Promise.all([client.invalidateQueries({ queryKey: ["fipe", vehicleId] }), client.invalidateQueries({ queryKey: ["vehicles"] })]);
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    const cents = parseMoneyInput(value);
    if (!cents || cents < 100) return setError("Informe o valor FIPE em reais.");
    save(cents);
  };

  return (
    <Sheet open={open} title="Valor FIPE" saveLabel={busy ? "Salvando…" : "Salvar"} canSave={!busy && !!value.trim()} onSave={submit} onCancel={onClose}>
      {error && (
        <div role="alert" className="text-center text-sm text-danger">
          {error}
        </div>
      )}
      <div className="flex items-baseline justify-center gap-1.5 px-4 font-rounded">
        <span className="text-[24px] font-semibold text-ios-label2">R$</span>
        <input
          value={value}
          onChange={(event) => {
            setValue(formatMoneyInput(event.target.value));
            setError("");
          }}
          inputMode="numeric"
          placeholder="0,00"
          aria-label="Valor FIPE"
          maxLength={14}
          autoFocus
          className="min-w-0 border-0 bg-transparent font-rounded text-[48px] font-bold tracking-[-.02em] text-ios-label tabular-nums outline-0 placeholder:text-ios-label3"
          style={{ width: `${Math.max(4, (value || "0,00").length) * 0.6}em` }}
        />
      </div>
      <p className="m-0 px-8 text-center text-[13px] text-pretty text-ios-label2">Deixe o valor da tabela FIPE do seu carro. O IPVA é estimado em 4%.</p>
      {manual && (
        <LinkButton onClick={() => !busy && save(null)} className="self-center p-2">
          Usar o valor automático da tabela FIPE
        </LinkButton>
      )}
    </Sheet>
  );
}
