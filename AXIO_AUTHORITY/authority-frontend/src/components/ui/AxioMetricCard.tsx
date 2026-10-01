import type { ReactNode } from "react";

/**
 * AxioMetricCard — a single network metric for the dashboard.
 * Dense, factual, no decorative charts. Shows "—" when the backend
 * has not provided a value rather than inventing one.
 */
export function AxioMetricCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-axio">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {icon && <span aria-hidden="true" className="text-slate-400">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
