"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export function Backdrop({ open, onClose, z = 20, strength = 30 }: { open: boolean; onClose: () => void; z?: number; strength?: 30 | 35 }) {
  return (
    <div
      aria-hidden
      onClick={onClose}
      className="app-frame transition-opacity duration-300"
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
      <div className="glass overflow-hidden rounded-[26px] bg-ios-glass">{children}</div>
      <button
        type="button"
        onClick={onCancel}
        className="h-[57px] w-full cursor-pointer rounded-full border-0 bg-ios-cell text-xl font-semibold text-ios-tint active:bg-ios-fill"
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

export function PhotoViewer({ src, onClose }: { src: string | null; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      inert={!src}
      className="app-frame z-[45] flex flex-col bg-black transition-opacity duration-300"
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
