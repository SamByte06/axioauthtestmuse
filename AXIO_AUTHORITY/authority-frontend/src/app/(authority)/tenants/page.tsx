"use client";

import Link from "next/link";
import { useState } from "react";
import type { Tenant, TenantLifecycle } from "@axio-authority/shared-types";
import { useApi } from "@/lib/use-api";
import { tenantsApi } from "@/lib/api/tenants-api";
import {
  AxioBadge,
  AxioSelect,
  AxioStateSwitch,
  AxioTable,
  type AxioTableColumn,
  type BadgeTone,
} from "@/components/ui";

const lifecycleTone: Record<TenantLifecycle, BadgeTone> = {
  CREATING: "info",
  PROVISIONING: "warning",
  READY: "healthy",
  ACTIVE: "healthy",
  SUSPENDED: "offline",
  DECOMMISSIONING: "degraded",
  DECOMMISSIONED: "neutral",
};

const provisioningTone: Record<string, BadgeTone> = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "warning",
  COMPLETED: "healthy",
  FAILED: "offline",
  ROLLED_BACK: "degraded",
};

/** /tenants — tenant data-store lifecycle across the network. */
export default function TenantsPage() {
  const [lifecycle, setLifecycle] = useState<TenantLifecycle | "">("");
  const { data, loading, error, retry } = useApi(
    () => tenantsApi.list({ lifecycle: lifecycle || undefined }),
    [lifecycle],
  );

  const columns: AxioTableColumn<Tenant>[] = [
    {
      key: "id",
      header: "Tenant ID",
      className: "font-mono text-xs",
      render: (t) => (
        <Link
          href={`/tenants/${encodeURIComponent(t.id)}`}
          className="text-brand-700 hover:text-brand-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded"
        >
          {t.id}
        </Link>
      ),
    },
    {
      key: "partner",
      header: "Partner ID",
      className: "font-mono text-xs whitespace-nowrap",
      render: (t) => t.partnerId,
    },
    { key: "org", header: "Organization", render: (t) => t.organizationName },
    { key: "region", header: "Region", render: (t) => t.region },
    {
      key: "isolation",
      header: "Isolation",
      render: (t) => (
        <AxioBadge tone="info">
          {t.isolationMode === "SHARED" ? "Shared" : "Dedicated DB"}
        </AxioBadge>
      ),
    },
    {
      key: "lifecycle",
      header: "Lifecycle",
      render: (t) => <AxioBadge tone={lifecycleTone[t.lifecycle]}>{t.lifecycle}</AxioBadge>,
    },
    {
      key: "provisioning",
      header: "Provisioning",
      render: (t) => (
        <AxioBadge tone={provisioningTone[t.provisioningStatus.state] ?? "neutral"}>
          {t.provisioningStatus.state}
        </AxioBadge>
      ),
    },
    {
      key: "operators",
      header: "Operators",
      className: "tabular-nums",
      render: (t) => String(t.operatorCount),
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Tenant data stores backing each partner. Provisioning is performed by
        the backend — this console requests and observes, never executes.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <AxioSelect
          label="Lifecycle filter"
          value={lifecycle}
          onChange={(e) => setLifecycle(e.target.value as TenantLifecycle | "")}
          options={[
            { value: "", label: "All lifecycles" },
            { value: "CREATING", label: "Creating" },
            { value: "PROVISIONING", label: "Provisioning" },
            { value: "READY", label: "Ready" },
            { value: "ACTIVE", label: "Active" },
            { value: "SUSPENDED", label: "Suspended" },
            { value: "DECOMMISSIONING", label: "Decommissioning" },
            { value: "DECOMMISSIONED", label: "Decommissioned" },
          ]}
          className="w-52"
        />
      </div>

      <AxioStateSwitch
        loading={loading}
        error={error}
        empty={!loading && !error && (data?.data.length ?? 0) === 0}
        loadingLabel="Loading tenants…"
        onRetry={retry}
        emptyTitle="No tenants found"
        emptyDescription="No tenants match the current filter."
      >
        {data && (
          <AxioTable caption="AxioVital tenants" columns={columns} rows={data.data} />
        )}
      </AxioStateSwitch>
    </div>
  );
}
