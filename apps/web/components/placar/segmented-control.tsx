"use client";

import { cx } from "@/lib/cx";

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: readonly [SegmentOption<T>, SegmentOption<T>];
  value: T;
  onChange: (value: T) => void;
  tone?: "translucent" | "fill";
}

export function SegmentedControl<T extends string>({ options, value, onChange, tone = "fill" }: SegmentedControlProps<T>) {
  const index = options.findIndex((option) => option.value === value);
  return (
    <div
      role="tablist"
      className={cx(
        "relative flex rounded-full p-0.5",
        tone === "fill" ? "bg-ios-fill" : "bg-[color-mix(in_srgb,var(--ios-label2)_16%,transparent)]",
      )}
    >
      <div
        aria-hidden
        className="absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-ios-thumb shadow-[0_3px_8px_color-mix(in_srgb,#000_14%,transparent),0_0_0_.5px_color-mix(in_srgb,#000_4%,transparent)] transition-transform duration-300 ease-ios"
        style={{ transform: index === 1 ? "translateX(100%)" : "none" }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
          className={cx(
            "relative h-9 flex-1 cursor-pointer border-0 bg-transparent text-[13px] text-ios-label disabled:cursor-default disabled:opacity-40",
            option.value === value ? "font-semibold" : "font-medium",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
