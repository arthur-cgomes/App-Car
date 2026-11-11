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
            className="flex h-[68px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[18px] border-0 bg-ios-cell px-0.5 py-1 text-center text-[12px] leading-[1.15] transition-[box-shadow,transform] duration-200 active:scale-95"
            style={{
              boxShadow: `inset 0 0 0 2px ${on ? `var(${category.colorToken})` : "transparent"}`,
              color: "var(--ios-label)",
              fontWeight: on ? 600 : 500,
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
