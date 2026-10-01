"use client";

import type { AuditEvent, AuditResult } from "@axio-authority/shared-types";
import { AxioTable, type AxioTableColumn } from "./AxioTable";
import { AxioBadge } from "./AxioBadge";

const resultTone: Record<AuditResult, "healthy" | "offline" | "warning"> = {
  SUCCESS: "healthy",
  FAILURE: "offline",
  DENIED: "warning",
};

/** AxioAuditTable — the canonical audit-log table. Append-only presentation. */
export function AxioAuditTable({ events }: { events: AuditEvent[] }) {
  const columns: AxioTableColumn<AuditEvent>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      className: "whitespace-nowrap font-mono text-xs",
      render: (e) => new Date(e.timestamp).toLocaleString(),
    },
    {
      key: "actor",
      header: "Actor",
      render: (e) => <span className="font-medium">{e.actor}</span>,
    },
    {
      key: "action",
      header: "Action",
      className: "whitespace-nowrap",
      render: (e) => <AxioBadge tone="neutral" mono>{e.action}</AxioBadge>,
    },
    {
      key: "resource",
      header: "Resource",
      className: "font-mono text-xs",
      render: (e) => e.resource,
    },
    {
      key: "result",
      header: "Result",
      render: (e) => <AxioBadge tone={resultTone[e.result]}>{e.result}</AxioBadge>,
    },
    {
      key: "correlation",
      header: "Correlation ID",
      className: "font-mono text-xs",
      render: (e) => e.correlationId ?? "—",
    },
  ];

  return (
    <AxioTable
      caption="Authority audit log. Records are append-only."
      columns={columns}
      rows={events}
      emptyMessage="No audit events match the current filters."
    />
  );
}
