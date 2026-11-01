"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { PushHeader } from "./shell/nav-bar";

export function PushPage({ title, backHref, trailing, children }: { title: string; backHref: string; trailing?: ReactNode; children: ReactNode }) {
  const router = useRouter();
  return (
    <div className="push-in min-h-full">
      <PushHeader title={title} onBack={() => router.push(backHref)} trailing={trailing} />
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 pt-2">{children}</div>
    </div>
  );
}

export function HeaderAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex h-9 cursor-pointer items-center border-0 bg-transparent text-ios-tint active:opacity-50">
      <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <path d="M5 12h14M12 5v14" />
      </svg>
    </button>
  );
}
