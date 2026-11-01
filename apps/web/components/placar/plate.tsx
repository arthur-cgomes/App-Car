import { formatPlate } from "@monitoring-car/shared";
import { cx } from "@/lib/cx";

const BADGE = {
  md: { width: 96, border: 1.5, radius: 5, band: 6, font: "600 21px/1.15", spacing: ".05em" },
  sm: { width: 64, border: 1.5, radius: 4, band: 4, font: "600 14px/1.2", spacing: ".04em" },
} as const;

export function PlateBadge({ plate, size = "md" }: { plate: string; size?: keyof typeof BADGE }) {
  const s = BADGE[size];
  return (
    <div
      className="flex-none overflow-hidden bg-white"
      style={{ width: s.width, border: `${s.border}px solid var(--color-text)`, borderRadius: s.radius }}
    >
      <div className="bg-accent-800" style={{ height: s.band }} />
      <div
        className="text-center font-plate text-plate-ink"
        style={{ font: `${s.font} var(--font-barlow-condensed)`, letterSpacing: s.spacing }}
      >
        {formatPlate(plate)}
      </div>
    </div>
  );
}

interface PlateInputProps {
  value: string;
  onChange: (plate: string) => void;
  label?: string;
  fontSize?: 44 | 46;
  maxWidth?: 260 | 280;
}

export function cleanPlateInput(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

export function PlateInput({ value, onChange, label = "Placa", fontSize = 46, maxWidth = 280 }: PlateInputProps) {
  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-lg bg-white"
      style={{ maxWidth, border: "2px solid var(--color-text)" }}
    >
      <div
        className="bg-accent-800 py-1 text-center text-white"
        style={{ font: "600 9px/1 var(--font-sans)", letterSpacing: ".3em" }}
      >
        BRASIL
      </div>
      <input
        value={value}
        onChange={(event) => onChange(cleanPlateInput(event.target.value))}
        placeholder="ABC1D23"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        aria-label={label}
        className={cx("w-full border-0 bg-transparent px-2 pt-1 pb-1.5 text-center uppercase text-plate-ink outline-0")}
        style={{ font: `600 ${fontSize}px/1.1 var(--font-barlow-condensed)`, letterSpacing: ".08em" }}
      />
    </div>
  );
}
