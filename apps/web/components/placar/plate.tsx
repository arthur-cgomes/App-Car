import { formatPlate } from "@monitoring-car/shared";
import { cx } from "@/lib/cx";

const BADGE = {
  md: { width: 92, border: 1.5, radius: 6, band: 7, font: "600 22px/1.1", spacing: ".08em" },
  lg: { width: 160, border: 2, radius: 8, band: 10, font: "600 40px/1.15", spacing: ".08em" },
  sm: { width: 64, border: 1.5, radius: 4, band: 4, font: "600 14px/1.2", spacing: ".04em" },
} as const;

export function PlateBadge({ plate, size = "md" }: { plate: string; size?: keyof typeof BADGE }) {
  const s = BADGE[size];
  return (
    <div
      className="flex-none overflow-hidden bg-white"
      style={{ width: s.width, border: `${s.border}px solid #1d1f20`, borderRadius: s.radius }}
    >
      <div style={{ height: s.band, background: "var(--plate-band)" }} />
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
      className="flex w-full flex-col overflow-hidden rounded-[10px] bg-white"
      style={{ maxWidth, border: "2px solid #1d1f20" }}
    >
      <div
        className="py-1 pl-2 text-left text-white"
        style={{ font: "700 9px/1 var(--font-sans)", letterSpacing: ".16em", background: "var(--plate-band)" }}
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
        className={cx("w-full border-0 bg-transparent px-2 pt-1 pb-1.5 text-center uppercase text-plate-ink outline-0 placeholder:text-[#b9b9be]")}
        style={{ font: `600 ${fontSize}px/1.1 var(--font-barlow-condensed)`, letterSpacing: ".08em" }}
      />
    </div>
  );
}
