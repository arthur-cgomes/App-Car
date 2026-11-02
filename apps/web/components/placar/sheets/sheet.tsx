"use client";

import type { ReactNode } from "react";
import { GlassIconButton } from "../buttons";

interface SheetProps {
  open: boolean;
  title: string;
  saveLabel: string;
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
  children: ReactNode;
}

export function Sheet({ open, title, saveLabel, canSave, onSave, onCancel, children }: SheetProps) {
  return (
    <div className="pointer-events-none app-frame z-[21] flex items-end justify-center md:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        inert={!open}
        className="pointer-events-auto flex h-[calc(100%-62px)] w-full flex-col overflow-hidden rounded-t-[38px] bg-ios-bg transition-transform duration-450 ease-ios md:h-auto md:max-h-[85dvh] md:w-[560px] md:rounded-[34px]"
        style={{ transform: open ? "translateY(0)" : "translateY(100dvh)" }}
      >
        <div className="flex flex-none justify-center pt-1.5 md:hidden">
          <div className="h-[5px] w-9 rounded-[3px] bg-ios-label3" />
        </div>
        <div className="flex h-14 flex-none items-center gap-3 px-4">
          <div className="flex flex-1">
            <GlassIconButton aria-label="Cancelar" onClick={onCancel}>
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </GlassIconButton>
          </div>
          <div className="truncate text-[17px] font-semibold">{title}</div>
          <div className="flex flex-1 justify-end">
            <button
              type="button"
              onClick={onSave}
              className="flex h-9 cursor-pointer items-center rounded-full border-0 px-4 text-[15px] font-semibold transition-transform duration-150 active:scale-95"
              style={canSave ? { background: "var(--color-accent)", color: "#fff" } : { background: "var(--ios-fill)", color: "var(--ios-label3)" }}
            >
              {saveLabel}
            </button>
          </div>
        </div>
        <div className="no-scrollbar flex flex-1 flex-col gap-[22px] overflow-y-auto pt-2 pb-10 *:shrink-0">{children}</div>
      </div>
    </div>
  );
}

