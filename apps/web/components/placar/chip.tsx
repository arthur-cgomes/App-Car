import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  size?: "md" | "sm";
}

export function Chip({ active, onClick, children, size = "md" }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "h-[34px] flex-none cursor-pointer rounded-[17px] border-0 whitespace-nowrap transition-colors duration-200 active:opacity-70",
        size === "md" ? "px-3.5 text-[15px]" : "px-[13px] text-sm",
        active ? "bg-accent text-white" : "bg-ios-cell text-ios-label",
      )}
    >
      {children}
    </button>
  );
}
