import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { GlassIconButton } from "../buttons";

export function NavBar({ title, collapsed, leading, actions }: { title: string; collapsed: boolean; leading?: ReactNode; actions?: ReactNode }) {
  return (
    <div
      className={cx(
        "glass pointer-events-none absolute inset-x-0 top-0 z-[5] border-b-[0.5px] transition-[background-color,border-color] duration-200",
        collapsed ? "border-ios-sep bg-[color-mix(in_srgb,var(--ios-bg)_78%,transparent)]" : "border-transparent bg-transparent [backdrop-filter:none]",
      )}
      style={{ height: "calc(env(safe-area-inset-top) + 56px)" }}
    >
      <div
        className="absolute inset-x-0 bottom-0 flex h-[52px] items-center justify-center text-[17px] font-semibold transition-opacity duration-200"
        style={{ opacity: collapsed ? 1 : 0 }}
      >
        {title}
      </div>
      {(leading || actions) && (
        <div className="absolute inset-x-0 bottom-0 mx-auto h-11 max-w-[720px]">
          {leading && <div className="pointer-events-auto absolute bottom-1.5 left-5 flex">{leading}</div>}
          {actions && <div className="pointer-events-auto absolute right-5 bottom-1.5 flex gap-2">{actions}</div>}
        </div>
      )}
    </div>
  );
}

export function PushHeader({ title, onBack, trailing }: { title: string; onBack: () => void; trailing?: ReactNode }) {
  return (
    <div
      className="glass sticky top-0 z-[2] bg-[color-mix(in_srgb,var(--ios-bg)_80%,transparent)]"
      style={{ height: "calc(env(safe-area-inset-top) + 52px)" }}
    >
      <GlassIconButton aria-label="Voltar" onClick={onBack} className="absolute bottom-2 left-5">
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </GlassIconButton>
      <div className="pointer-events-none absolute inset-x-16 bottom-0 flex h-[52px] items-center justify-center truncate text-[17px] font-semibold">
        {title}
      </div>
      {trailing && <div className="absolute right-5 bottom-2">{trailing}</div>}
    </div>
  );
}
