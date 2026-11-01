import { EXPENSE_CATEGORY_BY_CODE, type ExpenseCategoryCode } from "@monitoring-car/shared";
import { Icon, type IconName } from "./icon";

const SIZES = {
  sm: { box: 29, radius: 7, icon: 17 },
  md: { box: 36, radius: 9, icon: 22 },
  lg: { box: 60, radius: 14, icon: 28 },
} as const;

export function CategoryIcon({ code, size = "sm" }: { code: ExpenseCategoryCode; size?: keyof typeof SIZES }) {
  const category = EXPENSE_CATEGORY_BY_CODE[code];
  const s = SIZES[size];
  return (
    <span
      className="grid flex-none place-items-center text-white"
      style={{ width: s.box, height: s.box, borderRadius: s.radius, background: `var(${category.colorToken})` }}
    >
      <Icon name={category.icon as IconName} size={s.icon} stroke={1.75} />
    </span>
  );
}
