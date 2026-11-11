import { EXPENSE_CATEGORY_BY_CODE, type ExpenseCategoryCode } from "@monitoring-car/shared";
import { Icon, type IconName } from "./icon";

const SIZES = {
  sm: { box: 34, radius: 10, icon: 21 },
  md: { box: 32, radius: 16, icon: 18 },
  lg: { box: 44, radius: 12, icon: 26 },
} as const;

export function CategoryIcon({ code, size = "sm" }: { code: ExpenseCategoryCode; size?: keyof typeof SIZES }) {
  const category = EXPENSE_CATEGORY_BY_CODE[code];
  const s = SIZES[size];
  return (
    <span
      className="grid flex-none place-items-center text-white"
      style={{ width: s.box, height: s.box, borderRadius: s.radius, background: `var(${category.colorToken})` }}
    >
      <Icon name={category.icon as IconName} size={s.icon} />
    </span>
  );
}
