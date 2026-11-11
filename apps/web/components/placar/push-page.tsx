"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { GlassTextButton } from "./buttons";
import { PushHeader } from "./shell/nav-bar";

export function PushPage({ title, backHref, trailing, large, subtitle, children }: { title: string; backHref: string; trailing?: ReactNode; large?: boolean; subtitle?: ReactNode; children: ReactNode }) {
  const router = useRouter();
  return (
    <div className="push-in min-h-full">
      <PushHeader title={large ? "" : title} onBack={() => router.push(backHref)} trailing={trailing} />
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-[18px] pt-2">
        {large && (
          <div className="px-5">
            <h1 className="text-[28px] leading-tight font-bold tracking-[-.02em]">{title}</h1>
            {subtitle && <p className="text-[15px] text-pretty text-ios-label2">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function HeaderAddButton({ label, text = "Novo", onClick }: { label: string; text?: string; onClick: () => void }) {
  return (
    <GlassTextButton aria-label={label} onClick={onClick}>
      {text}
    </GlassTextButton>
  );
}
