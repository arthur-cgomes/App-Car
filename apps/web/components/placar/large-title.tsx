import type { ReactNode } from "react";

export function LargeTitle({ title, subtitle, inset = 20 }: { title: string; subtitle?: ReactNode; inset?: 4 | 20 }) {
  return (
    <div style={{ paddingInline: inset }}>
      <h1 className="text-[34px] leading-[41px] font-bold tracking-[-.02em]">{title}</h1>
      {subtitle !== undefined && <div className="min-h-[1lh] text-[15px] text-ios-label2">{subtitle}</div>}
    </div>
  );
}
