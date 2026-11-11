"use client";

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="h-[31px] w-[51px] flex-none cursor-pointer rounded-full border-0 p-0.5 transition-colors duration-200"
      style={{ background: checked ? "var(--green)" : "var(--ios-fill)" }}
    >
      <span
        className="block size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/25%)] transition-transform duration-250 ease-ios"
        style={{ transform: checked ? "translateX(20px)" : "none" }}
      />
    </button>
  );
}
