"use client";

import { forwardRef, useId, type SelectHTMLAttributes } from "react";

export interface AxioSelectOption {
  value: string;
  label: string;
}

export interface AxioSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  options: AxioSelectOption[];
  placeholder?: string;
}

/** AxioSelect — labelled native select (accessible, keyboard-friendly). */
export const AxioSelect = forwardRef<HTMLSelectElement, AxioSelectProps>(
  function AxioSelect(
    { label, hint, error, options, placeholder, id, className = "", ...rest },
    ref,
  ) {
    const autoId = useId();
    const selectId = id ?? `axio-select-${autoId}`;
    const hintId = hint ? `${selectId}-hint` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;

    return (
      <div className={className}>
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-[13px] font-medium text-slate-700"
        >
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          className={[
            "block h-10 w-full rounded-md border bg-white px-3 text-sm text-slate-900",
            "focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600",
            error ? "border-red-500" : "border-slate-300",
          ].join(" ")}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-xs text-slate-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  },
);
