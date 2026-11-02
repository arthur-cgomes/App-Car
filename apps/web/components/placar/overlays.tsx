"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export function Backdrop({ open, onClose, z = 20, strength = 30 }: { open: boolean; onClose: () => void; z?: number; strength?: 30 | 35 }) {
  return (
    <div
      aria-hidden
      onClick={onClose}
      className="fixed inset-0 transition-opacity duration-300"
      style={{
        zIndex: z,
        background: `color-mix(in srgb, #000 ${strength}%, transparent)`,
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
      }}
    />
  );
}

export function ActionPanel({ open, onCancel, cancelLabel = "Cancelar", children }: { open: boolean; onCancel: () => void; cancelLabel?: string; children: ReactNode }) {
  return (
    <div
      role="dialog"
      inert={!open}
      className="fixed inset-x-2.5 z-[31] mx-auto flex max-w-[480px] flex-col gap-2 transition-transform duration-400 ease-ios"
      style={{ bottom: "max(10px, env(safe-area-inset-bottom))", transform: open ? "translateY(0)" : "translateY(130%)" }}
    >
      <div className="glass overflow-hidden rounded-[14px] bg-ios-glass">{children}</div>
      <button
        type="button"
        onClick={onCancel}
        className="h-[57px] w-full cursor-pointer rounded-[14px] border-0 bg-ios-cell text-xl font-semibold text-ios-tint active:bg-ios-fill"
      >
        {cancelLabel}
      </button>
    </div>
  );
}

export function ActionPanelMessage({ children }: { children: ReactNode }) {
  return <div className="border-b-[0.5px] border-ios-sep px-4 py-3.5 text-center text-[13px] text-ios-label2">{children}</div>;
}

export function ActionPanelButton({ children, onClick, destructive }: { children: ReactNode; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "h-[57px] w-full cursor-pointer border-0 bg-transparent text-xl active:bg-ios-fill",
        destructive ? "text-danger-strong" : "text-ios-tint",
      )}
    >
      {children}
    </button>
  );
}

export function Banner({ banner, open, onTap }: { banner: { title: string; body: string; icon: string } | null; open: boolean; onTap: () => void }) {
  return (
    <div
      role="status"
      onClick={onTap}
      className="fixed inset-x-2.5 z-40 mx-auto flex max-w-[480px] cursor-pointer items-center gap-2.5 rounded-[22px] bg-ios-glass px-3.5 py-3 shadow-[0_10px_30px_color-mix(in_srgb,var(--color-neutral-900)_20%,transparent)] transition-transform duration-500 ease-ios [-webkit-backdrop-filter:blur(24px)_saturate(180%)] [backdrop-filter:blur(24px)_saturate(180%)]"
      style={{ top: "calc(env(safe-area-inset-top) + 10px)", transform: open ? "translateY(0)" : "translateY(-180%)" }}
    >
      <div className="grid size-[38px] flex-none place-items-center rounded-[9px] bg-accent-800 text-white" style={{ font: "600 18px/1 var(--font-barlow-condensed)", letterSpacing: ".04em" }}>
        {banner?.icon}
      </div>
      <div className="min-w-0 flex-1 text-sm leading-[1.3]">
        <div className="flex justify-between gap-2">
          <strong className="font-semibold">{banner?.title}</strong>
          <span className="text-xs text-ios-label2">agora</span>
        </div>
        <div className="text-ios-label">{banner?.body}</div>
      </div>
    </div>
  );
}

export function PhotoViewer({ src, onClose }: { src: string | null; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      inert={!src}
      className="fixed inset-0 z-[45] flex flex-col bg-black transition-opacity duration-300"
      style={{ opacity: src ? 1 : 0, pointerEvents: src ? "auto" : "none" }}
    >
      <div className="flex flex-none items-end justify-end px-4 pb-2" style={{ height: "calc(env(safe-area-inset-top) + 52px)" }}>
        <button type="button" onClick={onClose} className="h-9 cursor-pointer rounded-[18px] border-0 bg-white/20 px-3.5 text-[15px] font-semibold text-white active:opacity-60">
          OK
        </button>
      </div>
      <div className="flex min-h-0 flex-1 pb-[60px]">
        {src && (
          <span
            role="img"
            aria-label="Nota de serviço"
            className="block size-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${src}")` }}
          />
        )}
      </div>
    </div>
  );
}
