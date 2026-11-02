"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { fichaApi, type Fipe } from "@/lib/api/ficha";
import { parseMoneyInput } from "@/lib/format";
import { LinkButton } from "../buttons";
import { InputCell, centsToInput } from "../form-cells";
import { Footnote, Group, Section } from "../grouped-list";
import { useShell } from "../shell/shell-context";
import { Sheet } from "./sheet";

export function FipeSheet({ open, vehicleId, fipe, onClose }: { open: boolean; vehicleId: string; fipe?: Fipe; onClose: () => void }) {
  const shell = useShell();
  const client = useQueryClient();
  const manual = fipe?.available && fipe.manual;
  const [value, setValue] = useState(fipe?.available ? centsToInput(fipe.valueCents) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (fipeValueCents: number | null, message: string) => {
    setBusy(true);
    try {
      await fichaApi.updateVehicle(vehicleId, { fipeValueCents });
      await Promise.all([client.invalidateQueries({ queryKey: ["fipe", vehicleId] }), client.invalidateQueries({ queryKey: ["vehicles"] })]);
      onClose();
      shell.toast(message);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    const cents = parseMoneyInput(value);
    if (!cents || cents < 100) return setError("Informe o valor FIPE em reais.");
    save(cents, "Valor FIPE atualizado.");
  };

  return (
    <Sheet open={open} title="Valor FIPE" saveLabel={busy ? "Salvando…" : "Salvar"} canSave={!busy && !!value.trim()} onSave={submit} onCancel={onClose}>
      {error && (
        <div role="alert" className="text-center text-sm text-danger">
          {error}
        </div>
      )}
      <Section footer={<Footnote>Use o valor da tabela FIPE do seu carro. O IPVA estimado é calculado em 4% desse valor.</Footnote>}>
        <Group className="mx-4">
          <InputCell
            label="Valor FIPE"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError("");
            }}
            inputMode="decimal"
            placeholder="R$ 0,00"
            maxLength={14}
            autoFocus
          />
        </Group>
      </Section>
      {manual && (
        <LinkButton onClick={() => !busy && save(null, "Voltamos a usar a tabela FIPE automática.")} className="self-center p-2">
          Usar o valor automático da tabela FIPE
        </LinkButton>
      )}
    </Sheet>
  );
}
