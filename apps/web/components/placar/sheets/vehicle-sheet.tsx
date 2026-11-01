"use client";

import { VEHICLE_BRANDS, formatPlate, isValidPlate } from "@monitoring-car/shared";
import { useState } from "react";
import { errorMessage } from "@/lib/api/client";
import { plateApi, useAddVehicle, vehiclePlace, vehicleYears, type NewVehicle, type PlateVehicleData, type Vehicle } from "@/lib/api/vehicles";
import { useToday } from "@/lib/use-today";
import { LinkButton, PrimaryButton } from "../buttons";
import { Chip } from "../chip";
import { DatePickerCell } from "../date-picker";
import { InputCell } from "../form-cells";
import { Footnote, Group, Section, SectionHeader, ValueRow } from "../grouped-list";
import { PlateInput } from "../plate";
import { Sheet } from "./sheet";

const OTHER_BRAND = "Outra";

interface VehicleSheetProps {
  open: boolean;
  vehicles: Vehicle[];
  onCancel: () => void;
  onAdded: (vehicle: Vehicle) => void;
}

export function VehicleSheet({ open, vehicles, onCancel, onAdded }: VehicleSheetProps) {
  const today = useToday() ?? undefined;
  const addVehicle = useAddVehicle();
  const [plate, setPlate] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<PlateVehicleData | null>(null);
  const [manual, setManual] = useState(false);
  const [form, setForm] = useState({ brand: "", otherBrand: "", model: "", version: "", color: "", odometer: "", purchaseDate: "" });
  const [error, setError] = useState("");

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const checkPlate = () => {
    if (!isValidPlate(plate)) return "Placa inválida. Use ABC1D23 ou ABC1234.";
    if (vehicles.some((v) => v.plate === plate)) return "Este veículo já está na sua conta.";
    return "";
  };

  const search = async () => {
    const problem = checkPlate();
    if (problem) return setError(problem);
    setError("");
    setBusy(true);
    try {
      setFound(await plateApi.vehicleData(plate));
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (addVehicle.isPending) return;
    const problem = checkPlate();
    if (problem) return setError(problem);
    const base: NewVehicle = {
      plate,
      currentOdometer: Number.parseInt(form.odometer.replace(/\D/g, ""), 10) || 0,
      purchaseDate: form.purchaseDate || null,
    };
    if (manual) {
      const brand = form.brand === OTHER_BRAND ? form.otherBrand.trim() : form.brand;
      if (brand.length < 2) return setError("Escolha a marca.");
      if (!form.model.trim()) return setError("Informe o modelo.");
      base.manual = { brand, model: form.model.trim(), modelVersion: form.version.trim() || null, color: form.color.trim() || null };
    } else if (!found) {
      return setError("Busque a placa antes de adicionar.");
    }
    try {
      onAdded(await addVehicle.mutateAsync(base));
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  const ownership = (
    <>
      <InputCell label="Odômetro atual" value={form.odometer} onChange={(e) => set("odometer", e.target.value)} inputMode="numeric" placeholder="km" />
      <DatePickerCell label="Data da compra" value={form.purchaseDate} onChange={(value) => set("purchaseDate", value)} optional max={today} />
    </>
  );

  return (
    <Sheet
      open={open}
      title="Adicionar veículo"
      saveLabel={addVehicle.isPending ? "Adicionando…" : "Adicionar"}
      canSave={!!found || manual}
      onSave={add}
      onCancel={onCancel}
    >
      <div className="flex flex-col gap-5">
        <div className="mx-4 flex flex-col items-center gap-3.5 rounded-2xl bg-ios-cell px-4 py-[18px]">
          <PlateInput
            label="Placa do novo veículo"
            value={plate}
            onChange={(value) => {
              setPlate(value);
              setFound(null);
              setError("");
            }}
          />
          {!found && !manual && <PrimaryButton onClick={search}>{busy ? "Buscando…" : "Buscar dados do veículo"}</PrimaryButton>}
          {!found && (
            <LinkButton
              onClick={() => {
                setManual((current) => !current);
                setError("");
              }}
              className="text-[15px]"
            >
              {manual ? "Buscar pela placa" : "Preencher manualmente"}
            </LinkButton>
          )}
          {error && (
            <div role="alert" className="text-center text-sm text-danger-soft">
              {error}
            </div>
          )}
        </div>

        {found && (
          <Section header={<SectionHeader>Veículo encontrado</SectionHeader>} footer={<Footnote>Toque em Adicionar para salvar o veículo na sua conta.</Footnote>}>
            <Group className="mx-4 text-base">
              <div className="border-b-[0.5px] border-ios-sep px-4 py-3">
                <div className="text-[17px] font-semibold">
                  {found.brand} {found.model}
                </div>
                <div className="text-[13px] text-ios-tint">{formatPlate(plate)}</div>
              </div>
              <ValueRow label="Ano" value={vehicleYears(found)} />
              <ValueRow label="Cor" value={found.color} />
              <ValueRow label="Município" value={vehiclePlace(found)} />
              {ownership}
            </Group>
          </Section>
        )}

        {manual && !found && (
          <>
            <Section header={<SectionHeader>Marca</SectionHeader>}>
              <div className="mx-4 flex flex-wrap gap-2">
                {[...VEHICLE_BRANDS, OTHER_BRAND].map((brand) => (
                  <Chip key={brand} size="sm" active={form.brand === brand} onClick={() => set("brand", brand)}>
                    {brand}
                  </Chip>
                ))}
              </div>
            </Section>
            <Section header={<SectionHeader>Dados do veículo</SectionHeader>} footer={<Footnote>Sem consulta pela placa, o valor FIPE e os débitos não são importados.</Footnote>}>
              <Group className="mx-4 text-[17px]">
                {form.brand === OTHER_BRAND && (
                  <InputCell label="Qual marca" value={form.otherBrand} onChange={(e) => set("otherBrand", e.target.value)} maxLength={60} placeholder="Obrigatório" />
                )}
                <InputCell label="Modelo" value={form.model} onChange={(e) => set("model", e.target.value)} maxLength={80} placeholder="Ex.: Polo" />
                <InputCell label="Versão" value={form.version} onChange={(e) => set("version", e.target.value)} maxLength={120} placeholder="Ex.: Highline 200 TSI" />
                <InputCell label="Cor" value={form.color} onChange={(e) => set("color", e.target.value)} maxLength={30} placeholder="Ex.: Prata" />
                {ownership}
              </Group>
            </Section>
          </>
        )}
      </div>
    </Sheet>
  );
}
