"use client";

import type { ReactNode } from "react";

export interface AxioTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Accessible label when the cell content is icon-only. */
  ariaLabel?: (row: T) => string;
  className?: string;
}

/**
 * AxioTable — the professional data table for Authority.
 * Semantic <table>, caption for screen readers, sticky header,
 * tabular numbers for identifiers. No decorative styling.
 */
export function AxioTable<T extends { id: string }>({
  caption,
  columns,
  rows,
  rowKey,
  emptyMessage = "No records found.",
  onRowClick,
}: {
  caption: string;
  columns: AxioTableColumn<T>[];
  rows: T[];
  rowKey?: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}) {
  const keyOf = rowKey ?? ((row: T) => row.id);

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-axio">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={keyOf(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={[
                "border-b border-slate-100 last:border-0",
                onRowClick
                  ? "cursor-pointer hover:bg-brand-50/60 focus-within:bg-brand-50/60"
                  : "",
              ].join(" ")}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  aria-label={col.ariaLabel?.(row)}
                  className={`px-4 py-3 align-top text-slate-800 ${col.className ?? ""}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
