"use client";

export function PinInput({ value, onChange }: { value: string; onChange: (pin: string) => void }) {
  const active = Math.min(value.length, 5);
  return (
    <div className="relative grid grid-cols-6 gap-2">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="grid h-14 place-items-center rounded-[14px] bg-ios-cell font-rounded text-[26px] font-bold transition-shadow duration-150"
          style={{ boxShadow: `inset 0 0 0 2px ${index === active ? "var(--ios-tint)" : "transparent"}` }}
        >
          {value[index] ?? ""}
        </div>
      ))}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Código de 6 dígitos"
        className="absolute inset-0 size-full cursor-text text-base opacity-0"
      />
    </div>
  );
}
