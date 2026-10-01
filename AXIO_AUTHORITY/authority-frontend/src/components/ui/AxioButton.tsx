"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-700 text-white hover:bg-brand-800 focus-visible:ring-brand-600 border border-transparent",
  secondary:
    "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 focus-visible:ring-brand-600",
  danger:
    "bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-600 border border-transparent",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-brand-600 border border-transparent",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
};

export interface AxioButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

/**
 * AxioButton — the single button primitive for Authority.
 * Visible focus ring, disabled + loading states, no decorative gradients.
 */
export const AxioButton = forwardRef<HTMLButtonElement, AxioButtonProps>(
  function AxioButton(
    { variant = "primary", size = "md", loading = false, disabled, className = "", children, ...rest },
    ref,
  ) {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-md font-medium",
          "transition-colors duration-100 select-none",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variants[variant],
          sizes[size],
          className,
        ].join(" ")}
        {...rest}
      >
        {loading && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </button>
    );
  },
);
