"use client";

import type { ReactNode } from "react";

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
    <div className="pointer-events-none fixed inset-0 z-[21] flex items-end justify-center md:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        inert={!open}
        className="pointer-events-auto flex h-[calc(100%-62px)] w-full flex-col overflow-hidden rounded-t-xl bg-ios-bg transition-transform duration-450 ease-ios md:h-auto md:max-h-[85dvh] md:w-[560px] md:rounded-xl"
        style={{ transform: open ? "translateY(0)" : "translateY(100dvh)" }}
      >
        <div className="flex flex-none justify-center pt-1.5 md:hidden">
          <div className="h-[5px] w-9 rounded-[3px] bg-ios-label3" />
        </div>
        <div className="flex h-12 flex-none items-center px-4">
          <button type="button" onClick={onCancel} className="flex-1 cursor-pointer border-0 bg-transparent p-0 text-left text-[17px] text-ios-tint active:opacity-50">
            Cancelar
          </button>
          <div className="text-[17px] font-semibold">{title}</div>
          <button
            type="button"
            onClick={onSave}
            className="flex-1 cursor-pointer border-0 bg-transparent p-0 text-right text-[17px] font-semibold active:opacity-50"
            style={{ color: canSave ? "var(--ios-tint)" : "var(--ios-label3)" }}
          >
            {saveLabel}
          </button>
        </div>
        <div className="no-scrollbar flex flex-1 flex-col gap-[22px] overflow-y-auto pt-2 pb-10 *:shrink-0">{children}</div>
      </div>
    </div>
  );
}

