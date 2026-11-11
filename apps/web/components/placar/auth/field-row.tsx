import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

interface FieldRowProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  trailing?: ReactNode;
}

export function FieldRow({ label, trailing, className, placeholder, ...input }: FieldRowProps) {
  return (
    <div className="flex min-h-[45px] items-center gap-3 border-b-[0.5px] border-ios-sep px-4 last:border-b-0">
      <input
        {...input}
        aria-label={label}
        placeholder={placeholder ?? label}
        className={cx("min-w-0 flex-1 border-0 bg-transparent text-[17px] text-ios-label outline-0", className)}
      />
      {trailing}
    </div>
  );
}
