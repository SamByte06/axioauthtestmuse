"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";

export interface AxioInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  mono?: boolean;
  /**
   * "dark" renders white labels for use directly on AxioVital teal surfaces
   * (e.g. the sign-in screen). The input box itself stays white.
   */
  tone?: "light" | "dark";
}

/**
 * AxioInput — labelled text input with hint/error states.
 * Always renders an associated <label>; errors use aria-describedby.
 */
export const AxioInput = forwardRef<HTMLInputElement, AxioInputProps>(
  function AxioInput({ label, hint, error, mono, tone = "light", id, className = "", ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? `axio-input-${autoId}`;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const dark = tone === "dark";

    return (
      <div className={className}>
        <label
          htmlFor={inputId}
          className={`mb-1.5 block text-[13px] font-medium ${dark ? "text-white" : "text-slate-700"}`}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          className={[
            "block h-10 w-full rounded-md border bg-white px-3 text-sm text-slate-900",
            "placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600",
            mono ? "font-mono" : "",
            error ? "border-red-500" : "border-slate-300",
          ].join(" ")}
          {...rest}
        />
        {hint && !error && (
          <p id={hintId} className={`mt-1.5 text-xs ${dark ? "text-authority-200" : "text-slate-500"}`}>
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className={`mt-1.5 text-xs font-medium ${dark ? "text-red-200" : "text-red-700"}`}>
            {error}
          </p>
        )}
      </div>
    );
  },
);
