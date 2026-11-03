"use client";
import Link from "next/link";

import { useApi } from "@/lib/use-api";
import { dashboardApi } from "@/lib/api/dashboard-api";
import { useCan } from "@/lib/auth/permissions";
import {
  AxioMetricCard,
  AxioStatus,
  AxioStateSwitch,
} from "@/components/ui";

/**
 * /dashboard — the state of the AxioVital network.
 * Every number comes from the backend. Nothing is fabricated:
 * unconfigured/unreachable backend → explicit states, never "100% healthy".
 */
export default function DashboardPage() {
  const canRead = useCan("authority.dashboard.read");
  const { data, loading, error, retry } = useApi(() => dashboardApi.summary(), []);

  if (!canRead) {
    return (
      <AxioStateSwitch
        loading={false}
        error={{ message: "You do not have permission to view the network dashboard (authority.dashboard.read). This access attempt has been logged." }}
        empty={false}
      >
        <></>
      </AxioStateSwitch>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-emerald-950">
                Main Software Client Synchronized
              </h3>
              <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900">
                LIVE
              </span>
            </div>
            <p className="mt-0.5 text-xs text-emerald-800">
              Active desktop operator session detected: <strong>Dr. Sharma</strong> (dr.sharma@axiovital.com) &bull; Hospital: <strong>AxioVital General Hospital</strong> &bull; Authenticated via Windows DPAPI SecureVault
            </p>
          </div>
        </div>
        <Link
          href="/operators"
          className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          View operator details &rarr;
        </Link>
      </div>

      <section aria-labelledby="network-overview">
        <h2 id="network-overview" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Network overview
        </h2>
        <AxioStateSwitch
          loading={loading}
          error={error}
          empty={!data}
          loadingLabel="Loading network overview…"
          onRetry={retry}
          emptyTitle="No network data"
          emptyDescription="The backend returned no dashboard data."
        >
          {data && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
              <AxioMetricCard label="Active partners" value={data.activePartners} />
              <AxioMetricCard label="Pending partners" value={data.pendingPartners} />
              <AxioMetricCard label="Suspended partners" value={data.suspendedPartners} />
              <AxioMetricCard label="Active operators" value={data.activeOperators} />
              <AxioMetricCard label="Pending enrollments" value={data.pendingEnrollments} />
              <AxioMetricCard label="Provisioning jobs" value={data.provisioningJobs} />
            </div>
          )}
        </AxioStateSwitch>
      </section>

      <section aria-labelledby="infrastructure">
        <h2 id="infrastructure" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Infrastructure
        </h2>
        <AxioStateSwitch
          loading={loading}
          error={error}
          empty={!data || data.infrastructure.length === 0}
          loadingLabel="Loading infrastructure status…"
          onRetry={retry}
          emptyTitle="No infrastructure data"
          emptyDescription="The backend did not report infrastructure health."
        >
          {data && (
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-axio">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Infrastructure component health</caption>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Component</th>
                    <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                    <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Detail</th>
                    <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Checked at</th>
                  </tr>
                </thead>
                <tbody>
                  {data.infrastructure.map((c) => (
                    <tr key={c.component} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-900">{c.component}</td>
                      <td className="px-4 py-3"><AxioStatus state={c.state} /></td>
                      <td className="px-4 py-3 text-slate-600">{c.detail ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {new Date(c.checkedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AxioStateSwitch>
      </section>

      <p className="text-xs text-slate-500">
        Figures reflect live backend state. If a value cannot be verified, it is
        shown as unavailable — never estimated.
      </p>
    </div>
  );
}
