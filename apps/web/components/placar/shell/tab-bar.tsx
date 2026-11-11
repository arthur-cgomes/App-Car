"use client";

import Link from "next/link";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "../icon";

export const TABS = [
  { href: "/", title: "Resumo", icon: "dashboard" },
  { href: "/expenses", title: "Gastos", icon: "receipt-text" },
  { href: "/tires", title: "Pneus", icon: "tire" },
  { href: "/reminders", title: "Lembretes", icon: "bell" },
] as const satisfies readonly { href: string; title: string; icon: IconName }[];

export type TabHref = (typeof TABS)[number]["href"];

export function TabBar({ active, addLabel, addIcon = "plus", onAdd }: { active: TabHref; addLabel: string; addIcon?: IconName; onAdd: () => void }) {
  return (
    <div
      className="absolute inset-x-4 z-10 mx-auto flex max-w-[480px] items-center gap-2.5"
      style={{ bottom: "var(--tabbar-bottom)" }}
    >
      <nav
        aria-label="Navegação principal"
        className="flex h-[62px] flex-1 items-center rounded-[31px] bg-ios-glass p-1 shadow-[inset_0_0_0_0.5px_var(--ios-glassb)] [-webkit-backdrop-filter:blur(18px)_saturate(180%)] [backdrop-filter:blur(18px)_saturate(180%)]"
      >
        {TABS.map((tab) => {
          const on = tab.href === active;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={on ? "page" : undefined}
              className={cx(
                "flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[27px] text-[10px] font-semibold no-underline transition-colors duration-250 active:scale-[.94]",
                on ? "bg-ios-fill text-ios-tint" : "bg-transparent text-ios-label2",
              )}
            >
              <Icon name={tab.icon} size={24} />
              {tab.title}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        aria-label={addLabel}
        onClick={onAdd}
        className="grid size-[62px] flex-none cursor-pointer place-items-center rounded-full border-0 bg-accent text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--ios-tint)_35%,transparent)] transition-transform duration-200 active:scale-[.92]"
      >
        <Icon name={addIcon} size={26} />
      </button>
    </div>
  );
}
