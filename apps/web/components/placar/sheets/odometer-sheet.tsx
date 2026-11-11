"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { fichaApi } from "@/lib/api/ficha";
import type { Vehicle } from "@/lib/api/vehicles";
import { formatKmInput } from "@/lib/format";
import { Sheet } from "./sheet";

export function OdometerSheet({ open, vehicle, onClose, onSaved }: { open: boolean; vehicle: Vehicle; onClose: () => void; onSaved: () => void }) {
  const client = useQueryClient();
  const [value, setValue] = useState(formatKmInput(String(vehicle.currentOdometer)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const odometer = Number.parseInt(value.replace(/\D/g, ""), 10);
    if (!Number.isFinite(odometer)) return setError("Informe a km atual do carro.");
    setBusy(true);
    try {
      await fichaApi.updateVehicle(vehicle.id, { currentOdometer: odometer });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["vehicles"] }),
        client.invalidateQueries({ queryKey: ["reminders", vehicle.id] }),
        client.invalidateQueries({ queryKey: ["expenses", vehicle.id] }),
        client.invalidateQueries({ queryKey: ["tires", vehicle.id] }),
      ]);
      onSaved();
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
      <div className="flex items-baseline justify-center gap-1.5 px-4 font-rounded">
        <input
          value={value}
          onChange={(event) => {
            setValue(formatKmInput(event.target.value));
            setError("");
          }}
          inputMode="numeric"
          placeholder="0"
          aria-label="Odômetro"
          autoFocus
          className="min-w-0 border-0 bg-transparent text-right font-rounded text-[48px] font-bold tracking-[-.02em] text-ios-label tabular-nums outline-0"
          style={{ width: `${Math.max(2, (value || "0").length) * 0.6}em` }}
        />
        <span className="text-[24px] font-medium text-ios-label2">km</span>
      </div>
      <p className="m-0 px-8 text-center text-[13px] text-pretty text-ios-label2">Atualiza a vida útil dos pneus, o rodízio e a revisão. Vale o maior entre o informado e o maior lançado.</p>
    </Sheet>
  );
}
