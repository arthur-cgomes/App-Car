import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";

export function EmptyState({ icon, title, description, action }: { icon: IconName; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-8 py-14 text-center">
      <span className="text-ios-label3">
        <Icon name={icon} />
      </span>
      <div className="text-xl font-semibold">{title}</div>
      <div className="text-[15px] text-ios-label2">{description}</div>
      {action}
    </div>
  );
}

export function InlineEmpty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl bg-ios-cell px-4 py-3.5 text-[15px] text-ios-label2">{children}</div>;
}
