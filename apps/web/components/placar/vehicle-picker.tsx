"use client";

import { vehicleName, type Vehicle } from "@/lib/api/vehicles";
import { Icon } from "./icon";
import { ActionPanel, ActionPanelButton, ActionPanelMessage } from "./overlays";
import { PlateBadge } from "./plate";

interface VehiclePickerProps {
  open: boolean;
  vehicles: Vehicle[];
  activeId: string;
  onPick: (id: string) => void;
  onAdd: () => void;
  onCancel: () => void;
}

export function VehiclePicker({ open, vehicles, activeId, onPick, onAdd, onCancel }: VehiclePickerProps) {
  return (
    <ActionPanel open={open} onCancel={onCancel}>
      <ActionPanelMessage>Escolha o veículo</ActionPanelMessage>
      {vehicles.map((vehicle) => (
        <button
          key={vehicle.id}
          type="button"
          onClick={() => onPick(vehicle.id)}
          className="flex min-h-[60px] w-full cursor-pointer items-center gap-3 border-0 border-b-[0.5px] border-ios-sep bg-transparent px-4 text-left text-ios-label active:bg-ios-fill"
        >
          <PlateBadge plate={vehicle.plate} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="text-[17px]">{vehicleName(vehicle)}</div>
            <div className="text-[13px] text-ios-label2">{[vehicle.yearModel, vehicle.color].filter(Boolean).join(" · ")}</div>
          </div>
          <span className="text-ios-tint" style={{ opacity: vehicle.id === activeId ? 1 : 0 }}>
            <Icon name="check" size={18} stroke={2.25} />
          </span>
        </button>
      ))}
      <ActionPanelButton onClick={onAdd}>Adicionar veículo</ActionPanelButton>
    </ActionPanel>
  );
}
