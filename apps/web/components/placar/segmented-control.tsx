"use client";

import { cx } from "@/lib/cx";

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
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
        className="absolute top-0.5 bottom-0.5 left-0.5 rounded-full bg-ios-thumb shadow-[0_2px_8px_rgb(0_0_0/18%)] transition-transform duration-300 ease-ios"
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
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
            "relative h-8 flex-1 cursor-pointer border-0 bg-transparent text-sm font-semibold text-ios-label disabled:cursor-default disabled:opacity-40",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
