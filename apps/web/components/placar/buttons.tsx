import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

export function PrimaryButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-accent text-[17px] font-semibold text-white transition-transform duration-150 active:scale-[.98] active:bg-accent-600 disabled:opacity-60",
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
        "flex h-[52px] w-full cursor-pointer items-center justify-center rounded-full border-0 bg-ios-tintbg text-[17px] font-semibold text-ios-tintfg transition-transform duration-150 active:scale-[.98] active:opacity-80",
        className,
      )}
    />
  );
}

export function GlassIconButton({ className, ...props }: ButtonProps & { "aria-label": string }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "glass-control grid size-9 flex-none cursor-pointer place-items-center rounded-full border-0 p-0 text-ios-label transition-transform duration-150 active:scale-95",
        className,
      )}
    />
  );
}

export function GlassTextButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "glass-control flex h-9 flex-none cursor-pointer items-center rounded-full border-0 px-3.5 text-[15px] font-semibold text-ios-tint transition-transform duration-150 active:scale-95 disabled:cursor-default disabled:text-ios-label3",
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
