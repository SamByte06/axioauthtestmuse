"use client";

import Link from "next/link";
import { useState } from "react";
import type { Partner, PartnerStatus } from "@axio-authority/shared-types";
import { useApi } from "@/lib/use-api";
import { partnersApi } from "@/lib/api/partners-api";
import { useCan } from "@/lib/auth/permissions";
import {
  AxioBadge,
  AxioButton,
  AxioSelect,
  AxioStateSwitch,
  AxioTable,
  type AxioTableColumn,
} from "@/components/ui";

const statusTone: Record<PartnerStatus, "healthy" | "warning" | "offline" | "neutral"> = {
  ACTIVE: "healthy",
  PENDING: "warning",
  SUSPENDED: "offline",
  DECOMMISSIONED: "neutral",
};

/** /partners — B2B partner organizations managed by the Authority. */
export default function PartnersPage() {
  const canCreate = useCan("authority.partner.create");
  const [status, setStatus] = useState<PartnerStatus | "">("");
  const { data, loading, error, retry } = useApi(
    () => partnersApi.list({ status: status || undefined }),
    [status],
  );

  const columns: AxioTableColumn<Partner>[] = [
    {
      key: "organization",
      header: "Organization",
      render: (p) => (
        <span>
          <Link
            href={`/partners/${encodeURIComponent(p.id)}`}
            className="font-medium text-brand-700 hover:text-brand-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded"
          >
            {p.organizationName}
          </Link>
          {p.testFixture && (
            <AxioBadge tone="warning" className="ml-2">TEST</AxioBadge>
          )}
        </span>
      ),
    },
    {
      key: "id",
      header: "Partner ID",
      className: "font-mono text-xs whitespace-nowrap",
      render: (p) => p.id,
    },
    { key: "state", header: "State", render: (p) => p.state },
    {
      key: "isolation",
      header: "Isolation",
      render: (p) => (
        <AxioBadge tone="info">
          {p.isolationMode === "SHARED" ? "Shared" : "Dedicated DB"}
        </AxioBadge>
      ),
    },
    {
      key: "operators",
      header: "Operators",
      className: "tabular-nums",
      render: (p) => String(p.operatorCount),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <AxioBadge tone={statusTone[p.status]}>{p.status}</AxioBadge>,
    },
    {
      key: "created",
      header: "Created",
      className: "whitespace-nowrap font-mono text-xs",
      render: (p) => new Date(p.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          B2B healthcare organizations onboarded to the AxioVital network.
        </p>
        {canCreate && (
          <Link href="/partners/new">
            <AxioButton>Create partner</AxioButton>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <AxioSelect
          label="Status filter"
          value={status}
          onChange={(e) => setStatus(e.target.value as PartnerStatus | "")}
          options={[
            { value: "", label: "All statuses" },
            { value: "PENDING", label: "Pending" },
            { value: "ACTIVE", label: "Active" },
            { value: "SUSPENDED", label: "Suspended" },
            { value: "DECOMMISSIONED", label: "Decommissioned" },
          ]}
          className="w-52"
        />
      </div>

      <AxioStateSwitch
        loading={loading}
        error={error}
        empty={!loading && !error && (data?.data.length ?? 0) === 0}
        loadingLabel="Loading partners…"
        onRetry={retry}
        emptyTitle="No partners found"
        emptyDescription="No partner organizations match the current filter."
      >
        {data && (
          <AxioTable
            caption="AxioVital partner organizations"
            columns={columns}
            rows={data.data}
          />
        )}
      </AxioStateSwitch>
    </div>
  );
}
