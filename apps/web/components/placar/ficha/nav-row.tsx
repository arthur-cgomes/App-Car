import Link from "next/link";
import type { ReactNode } from "react";
import { ROW_BODY } from "../grouped-list";
import { Icon, type IconName } from "../icon";

export function NavRow({ href, icon, title, value }: { href: string; icon: IconName; title: string; value?: ReactNode }) {
  return (
    <Link href={href} className="group/row flex items-center gap-3 pl-4 text-ios-label no-underline active:bg-ios-fill">
      <span className="grid size-[34px] flex-none place-items-center rounded-[10px] bg-ios-fill text-ios-label">
        <Icon name={icon} />
      </span>
      <div className={`flex min-h-[46px] min-w-0 flex-1 items-center gap-2 pr-3 ${ROW_BODY}`}>
        <span className="flex-1 text-[17px]">{title}</span>
        {value && <span className="text-[15px] text-ios-label2">{value}</span>}
        <span className="text-ios-label3">
          <Icon name="right" />
        </span>
      </div>
    </Link>
  );
}
