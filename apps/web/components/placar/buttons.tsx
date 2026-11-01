import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

export function PrimaryButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border-0 bg-accent text-[17px] font-semibold text-white transition-transform duration-150 active:scale-[.98] active:bg-accent-600 disabled:opacity-60",
        className,
      )}
    />
  );
}

export function TintedButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "flex h-[50px] w-full cursor-pointer items-center justify-center rounded-[14px] border-0 bg-ios-tintbg text-[17px] font-semibold text-ios-tintfg transition-transform duration-150 active:scale-[.98] active:opacity-80",
        className,
      )}
    />
  );
}

export function LinkButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cx("cursor-pointer border-0 bg-transparent text-[15px] text-ios-tint active:opacity-50", className)}
    />
  );
}
