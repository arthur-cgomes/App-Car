import type { ReactNode } from "react";
import { PushHeader } from "../shell/nav-bar";

export function AuthScreen({ children, header }: { children: ReactNode; header?: { title: string; onBack: () => void } }) {
  return (
    <div className="no-scrollbar app-frame overflow-y-auto bg-ios-bg">
      {header && <PushHeader title={header.title} onBack={header.onBack} />}
      <div
        className="mx-auto flex min-h-full w-full max-w-[430px] flex-col gap-[26px] px-5"
        style={{
          paddingTop: header ? 16 : "calc(env(safe-area-inset-top) + 72px)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 48px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function StepIntro({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-[28px] leading-tight font-bold tracking-[-.02em]">{title}</h1>
      {children && <p className="text-[15px] text-pretty text-ios-label2">{children}</p>}
    </div>
  );
}
