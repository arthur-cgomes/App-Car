"use client";

import { EXPENSE_CATEGORIES, type ExpenseCategoryCode } from "@monitoring-car/shared";
import { CategoryIcon } from "./category-icon";

export function CategoryGrid({ value, onChange }: { value: ExpenseCategoryCode; onChange: (code: ExpenseCategoryCode) => void }) {
  return (
    <div className="mx-4 grid grid-cols-4 gap-2">
      {EXPENSE_CATEGORIES.map((category) => {
        const on = value === category.code;
        return (
          <button
            key={category.code}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(category.code)}
            className="flex h-20 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[22px] border-0 bg-ios-cell px-0.5 py-1 text-center text-[11px] leading-[1.15] transition-[box-shadow,transform] duration-200 active:scale-95"
            style={{
              boxShadow: `inset 0 0 0 2px ${on ? "var(--color-accent)" : "transparent"}`,
              color: on ? "var(--ios-tintfg)" : "var(--ios-label)",
              fontWeight: on ? 600 : 400,
            }}
          >
            <CategoryIcon code={category.code} size="md" />
            {category.name}
          </button>
        );
      })}
    </div>
  );
}
