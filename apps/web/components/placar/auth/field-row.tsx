import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

interface FieldRowProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  labelWidth?: number;
  trailing?: ReactNode;
}

export function FieldRow({ label, labelWidth = 96, trailing, className, ...input }: FieldRowProps) {
  return (
    <label className="flex min-h-[50px] items-center gap-3 border-b-[0.5px] border-ios-sep px-4 last:border-b-0">
      <span className="flex-none text-[17px]" style={{ width: labelWidth }}>
        {label}
      </span>
      <input
        {...input}
        className={cx("min-w-0 flex-1 border-0 bg-transparent text-[17px] text-ios-label outline-0", className)}
      />
      {trailing}
    </label>
  );
}
