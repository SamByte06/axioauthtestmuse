"use client";

import Link from "next/link";
import type { Partner, PartnerStatus } from "@axio-authority/shared-types";
import { useApi } from "@/lib/use-api";
import { dashboardApi } from "@/lib/api/dashboard-api";
import { partnersApi } from "@/lib/api/partners-api";
import { useCan } from "@/lib/auth/permissions";
import {
  AxioBadge,
  AxioButton,
  AxioMetricCard,
  AxioStatus,
  AxioStateSwitch,
  type BadgeTone,
} from "@/components/ui";

const statusTone: Record<PartnerStatus, BadgeTone> = {
  ACTIVE: "healthy",
  PENDING: "warning",
  SUSPENDED: "offline",
  DECOMMISSIONED: "neutral",
};

/**
 * /dashboard — the state of the AxioVital network.
 * Every number comes from the backend. Nothing is fabricated:
 * unconfigured/unreachable backend → explicit states, never "100% healthy".
 */
export default function DashboardPage() {
  const canRead = useCan("authority.dashboard.read");
  const canRegister = useCan("authority.partner.create");
  const canSuspend = useCan("authority.partner.suspend");

  const { data, loading, error, retry } = useApi(() => dashboardApi.summary(), []);
  const {
    data: directoryData,
    loading: directoryLoading,
    error: directoryError,
    retry: retryDirectory,
  } = useApi(() => partnersApi.list({ pageSize: 15 }), []);

  if (!canRead) {
    return (
      <AxioStateSwitch
        loading={false}
        error={{
          message:
            "You do not have permission to view the network dashboard (authority.dashboard.read). This access attempt has been logged.",
        }}
        empty={false}
      >
        <></>
      </AxioStateSwitch>
    );
  }

  return (
    <div className="space-y-8">
      {/* Action entry points (D-3) */}
      <section aria-labelledby="quick-actions">
        <h2 id="quick-actions" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Super Admin Actions
        </h2>
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-axio">
          {canRegister && (
            <Link href="/partners/new">
              <AxioButton size="sm">Register hospital</AxioButton>
            </Link>
          )}
          <Link href="/operators?action=provision-admin">
            <AxioButton variant="secondary" size="sm">Provision admin</AxioButton>
          </Link>
          <Link href="/operators">
            <AxioButton variant="secondary" size="sm">Manage users</AxioButton>
          </Link>
          <Link href="/operators">
            <AxioButton variant="secondary" size="sm">Assign roles</AxioButton>
          </Link>
          {canSuspend && (
            <Link href="/partners">
              <AxioButton variant="danger" size="sm">Suspend access</AxioButton>
            </Link>
          )}
          <Link href="/audit">
            <AxioButton variant="secondary" size="sm">View audit logs</AxioButton>
          </Link>
        </div>
      </section>

      {/* Summary counters (D-1, D-4) */}
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
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
              <AxioMetricCard
                label="Registered hospitals"
                value={data.registeredHospitals !== undefined ? data.registeredHospitals : "Not reported by backend"}
              />
              <AxioMetricCard
                label="Employee accounts"
                value={data.totalEmployees !== undefined ? data.totalEmployees : "Not reported by backend"}
              />
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

      {/* Hospital directory (D-2, D-4) */}
      <section aria-labelledby="hospital-directory">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="hospital-directory" className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Hospital Directory
          </h2>
          <Link
            href="/partners"
            className="text-xs font-medium text-brand-700 hover:text-brand-800 hover:underline"
          >
            View all hospitals →
          </Link>
        </div>
        <AxioStateSwitch
          loading={directoryLoading}
          error={directoryError}
          empty={!directoryData || directoryData.data.length === 0}
          loadingLabel="Loading hospital directory…"
          onRetry={retryDirectory}
          emptyTitle="No hospitals registered"
          emptyDescription="The backend returned no hospital partners."
        >
          {directoryData && (
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-axio">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Registered Hospital Directory</caption>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Hospital Name
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Hospital ID
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Administrators
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Employees
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {directoryData.data.map((hospital: Partner) => (
                    <tr key={hospital.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <Link
                          href={`/partners/${encodeURIComponent(hospital.id)}`}
                          className="text-brand-700 hover:text-brand-800 hover:underline"
                        >
                          {hospital.organizationName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {hospital.id}
                      </td>
                      <td className="px-4 py-3">
                        <AxioBadge tone={statusTone[hospital.status] ?? "neutral"}>
                          {hospital.status}
                        </AxioBadge>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {hospital.adminCount !== undefined ? hospital.adminCount : "Not reported by backend"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {hospital.employeeCount !== undefined ? hospital.employeeCount : "Not reported by backend"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/partners/${encodeURIComponent(hospital.id)}`}
                          className="text-xs font-medium text-brand-700 hover:text-brand-800 hover:underline"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AxioStateSwitch>
      </section>

      {/* Infrastructure health */}
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
