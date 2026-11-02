"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
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

const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 0.6;

export function Sheet({ open, title, saveLabel, canSave, onSave, onCancel, children }: SheetProps) {
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ y: number; at: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const begin = (y: number) => {
    start.current = { y, at: Date.now() };
  };
  const move = (y: number) => {
    if (!start.current) return;
    const distance = y - start.current.y;
    if (distance < 0 && drag === null) {
      start.current = null;
      return;
    }
    setDrag(Math.max(0, distance));
  };
  const end = (y: number) => {
    if (!start.current) return;
    const distance = y - start.current.y;
    const velocity = distance / Math.max(1, Date.now() - start.current.at);
    start.current = null;
    setDrag(null);
    if (distance > CLOSE_DISTANCE || (distance > 30 && velocity > CLOSE_VELOCITY)) onCancel();
  };
  const fromHeader = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    begin(event.clientY);
  };

  return (
    <div className="pointer-events-none app-frame z-[21] flex items-end justify-center md:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        inert={!open}
        className="pointer-events-auto flex h-[calc(100%-62px)] w-full flex-col overflow-hidden rounded-t-[38px] bg-ios-bg duration-450 ease-ios md:h-auto md:max-h-[85dvh] md:w-[560px] md:rounded-[34px]"
        style={{
          transform: drag !== null ? `translateY(${drag}px)` : open ? "translateY(0)" : "translateY(100dvh)",
          transitionProperty: drag !== null ? "none" : "transform",
        }}
      >
        <div
          className="flex-none touch-none select-none"
          onPointerDown={fromHeader}
          onPointerMove={(event) => move(event.clientY)}
          onPointerUp={(event) => end(event.clientY)}
          onPointerCancel={(event) => end(event.clientY)}
        >
          <div className="flex flex-none justify-center pt-1.5 md:hidden">
            <div className="h-[5px] w-9 rounded-[3px] bg-ios-label3" />
          </div>
          <div className="flex h-14 flex-none items-center gap-3 px-4">
            <div className="flex flex-1">
              <GlassIconButton aria-label="Cancelar" onClick={onCancel}>
                <svg
                  aria-hidden
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                >
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
                style={
                  canSave
                    ? { background: "var(--color-accent)", color: "#fff" }
                    : { background: "var(--ios-fill)", color: "var(--ios-label3)" }
                }
              >
                {saveLabel}
              </button>
            </div>
          </div>
        </div>
        <div
          ref={scroller}
          className="no-scrollbar flex flex-1 flex-col gap-[22px] overflow-y-auto overscroll-contain pt-2 pb-10 *:shrink-0"
          onTouchStart={(event) => {
            if ((scroller.current?.scrollTop ?? 0) <= 0) begin(event.touches[0].clientY);
          }}
          onTouchMove={(event) => move(event.touches[0].clientY)}
          onTouchEnd={(event) => end(event.changedTouches[0].clientY)}
          onTouchCancel={(event) => end(event.changedTouches[0].clientY)}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
