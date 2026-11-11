"use client";

import { vehicleName, type Vehicle } from "@/lib/api/vehicles";
import { Icon } from "./icon";
import { ActionPanel, ActionPanelButton, ActionPanelMessage } from "./overlays";

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
      <ActionPanelMessage>Escolher veículo</ActionPanelMessage>
      {vehicles.map((vehicle) => (
        <button
          key={vehicle.id}
          type="button"
          onClick={() => onPick(vehicle.id)}
          className="flex min-h-[50px] w-full cursor-pointer items-center gap-3 border-0 border-b-[0.5px] border-ios-sep bg-transparent px-4 text-left text-ios-label active:bg-ios-fill"
        >
          <div className="min-w-0 flex-1 truncate text-[17px]">
            {vehicleName(vehicle)} · {vehicle.plate}
          </div>
          <span className="text-ios-label" style={{ opacity: vehicle.id === activeId ? 1 : 0 }}>
            <Icon name="check" size={18} />
          </span>
        </button>
      ))}
      <ActionPanelButton onClick={onAdd}>Adicionar veículo</ActionPanelButton>
    </ActionPanel>
  );
}
