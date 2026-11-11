"use client";

import type { Expense } from "@/lib/api/expenses";
import { expenseMeta } from "@/lib/expense-selectors";
import { brl } from "@/lib/format";
import { cx } from "@/lib/cx";
import { CategoryIcon } from "./category-icon";
import { ROW_BODY } from "./grouped-list";
import { Icon } from "./icon";
import { Masked } from "./masked";

export function ExpenseRow({ expense, onClick }: { expense: Expense; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/row flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent py-0 pr-0 pl-4 text-left active:bg-ios-fill"
    >
      <CategoryIcon code={expense.category} />
      <div className={cx("flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-4", ROW_BODY)}>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[17px] text-ios-label">{expense.description}</div>
          <div className="truncate text-sm text-ios-label2">{expenseMeta(expense)}</div>
        </div>
        {expense.attachments.length > 0 && (
          <span className="text-ios-label2">
            <Icon name="clip" size={15} />
          </span>
        )}
        <span className="text-[17px] whitespace-nowrap text-ios-label tabular-nums"><Masked text={brl(expense.amountCents)} /></span>
      </div>
    </button>
  );
}
