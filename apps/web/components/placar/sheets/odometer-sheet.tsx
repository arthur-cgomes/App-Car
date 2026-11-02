"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { fichaApi } from "@/lib/api/ficha";
import type { Vehicle } from "@/lib/api/vehicles";
import { formatKmInput, km } from "@/lib/format";
import { InputCell } from "../form-cells";
import { Footnote, Group, Section } from "../grouped-list";
import { Sheet } from "./sheet";

export function OdometerSheet({ open, vehicle, onClose, onSaved }: { open: boolean; vehicle: Vehicle; onClose: () => void; onSaved: (message: string) => void }) {
  const client = useQueryClient();
  const [value, setValue] = useState(formatKmInput(String(vehicle.currentOdometer)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const odometer = Number.parseInt(value.replace(/\D/g, ""), 10);
    if (!Number.isFinite(odometer)) return setError("Informe a km atual do carro.");
    setBusy(true);
    try {
      const updated = await fichaApi.updateVehicle(vehicle.id, { currentOdometer: odometer });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["vehicles"] }),
        client.invalidateQueries({ queryKey: ["reminders", vehicle.id] }),
        client.invalidateQueries({ queryKey: ["expenses", vehicle.id] }),
      ]);
      onSaved(
        updated.currentOdometer > odometer
          ? `O carro segue com ${km(updated.currentOdometer)}, a maior km já lançada nos gastos.`
          : `Km atualizada para ${km(updated.currentOdometer)}.`,
      );
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} title="Km atual" saveLabel={busy ? "Salvando…" : "Salvar"} canSave={!busy && !!value} onSave={submit} onCancel={onClose}>
      {error && (
        <div role="alert" className="text-center text-sm text-danger">
          {error}
        </div>
      )}
      <Section footer={<Footnote>Atualize com o número do painel do carro. Os lembretes de revisão usam essa km.</Footnote>}>
        <Group className="mx-4">
          <InputCell
            label="Odômetro"
            value={value}
            onChange={(event) => {
              setValue(formatKmInput(event.target.value));
              setError("");
            }}
            inputMode="numeric"
            placeholder="km"
            autoFocus
          />
        </Group>
      </Section>
    </Sheet>
  );
}
