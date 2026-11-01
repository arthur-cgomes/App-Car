"use client";

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="h-[31px] w-[51px] flex-none cursor-pointer rounded-2xl border-0 p-0.5 transition-colors duration-250"
      style={{ background: checked ? "var(--color-accent)" : "var(--ios-fill)" }}
    >
      <span
        className="block size-[27px] rounded-full bg-white shadow-[0_3px_8px_color-mix(in_srgb,#000_15%,transparent),0_1px_1px_color-mix(in_srgb,#000_16%,transparent)] transition-transform duration-250 ease-ios"
        style={{ transform: checked ? "translateX(20px)" : "none" }}
      />
    </button>
  );
}
