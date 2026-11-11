import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export function Group({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("overflow-hidden rounded-xl bg-ios-cell", className)}>{children}</div>;
}

export function SectionHeader({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="flex justify-between px-7 text-[13px] text-ios-label2 uppercase">
      <span>{children}</span>
      {trailing && <span className="tabular-nums">{trailing}</span>}
    </div>
  );
}

export function Footnote({ children }: { children: ReactNode }) {
  return <div className="px-7 text-[13px] text-pretty text-ios-label2">{children}</div>;
}

export function Section({ header, footer, children }: { header?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {header}
      {children}
      {footer}
    </div>
  );
}

export const ROW_BODY = "border-b-[0.5px] border-ios-sep group-last/row:border-transparent";

export function ValueRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="group/row">
      <div className={cx("flex min-h-[44px] items-center justify-between gap-3 px-4 py-2.5 text-[17px]", ROW_BODY)}>
        <span>{label}</span>
        <span className="text-ios-label2">{value}</span>
      </div>
    </div>
  );
}
