"use client";

import { useApi } from "@/lib/use-api";
import { securityApi } from "@/lib/api/security-api";
import { useCan } from "@/lib/auth/permissions";
import {
  AxioMetricCard,
  AxioStateSwitch,
  AxioStatus,
  AxioBadge,
  type BadgeTone,
} from "@/components/ui";

const severityTone: Record<string, BadgeTone> = {
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "offline",
};

/** /security — platform security posture. No secret values are ever shown. */
export default function SecurityPage() {
  const canRead = useCan("authority.security.read");
  const { data, loading, error, retry } = useApi(() => securityApi.summary(), []);

  if (!canRead) {
    return (
      <AxioStateSwitch
        loading={false}
        error={{ message: "You do not have permission to view security state (authority.security.read). This access attempt has been logged." }}
        empty={false}
      >
        <></>
      </AxioStateSwitch>
    );
  }

  return (
    <div className="space-y-8">
      <AxioStateSwitch
        loading={loading}
        error={error}
        empty={!data}
        loadingLabel="Loading security posture…"
        onRetry={retry}
        emptyTitle="No security data"
      >
        {data && (
          <>
            <section aria-labelledby="sec-metrics">
              <h2 id="sec-metrics" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Posture
              </h2>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
                <AxioMetricCard
                  label="Failed logins (24h)"
                  value={data.failedAuthAttempts24h}
                />
                <AxioMetricCard
                  label="Active sessions"
                  value={data.activeAuthoritySessions}
                />
                <AxioMetricCard
                  label="Pending enrollments"
                  value={data.pendingEnrollments}
                />
                <AxioMetricCard
                  label="Revoked credentials"
                  value={data.revokedCredentials}
                />
                <AxioMetricCard
                  label="Suspended operators"
                  value={data.suspendedOperators}
                />
                <div className="rounded-md border border-slate-200 bg-white p-4 shadow-axio">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Authentication
                  </p>
                  <p className="mt-2">
                    <AxioStatus state={data.authentication.state} />
                  </p>
                  {data.authentication.detail && (
                    <p className="mt-1 text-xs text-slate-500">{data.authentication.detail}</p>
                  )}
                </div>
              </div>
            </section>

            <section aria-labelledby="sec-events" className="mt-8">
              <h2 id="sec-events" className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Recent security events
              </h2>
              {data.recentSecurityEvents.length === 0 ? (
                <p className="rounded-md border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                  No recent security events reported.
                </p>
              ) : (
                <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-axio">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">Recent security events</caption>
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Time</th>
                        <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Type</th>
                        <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Severity</th>
                        <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Actor</th>
                        <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Correlation ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentSecurityEvents.map((e) => (
                        <tr key={e.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                            {new Date(e.occurredAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{e.type}</td>
                          <td className="px-4 py-3">
                            <AxioBadge tone={severityTone[e.severity] ?? "neutral"}>
                              {e.severity}
                            </AxioBadge>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{e.actor ?? "—"}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            {e.correlationId ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </AxioStateSwitch>
    </div>
  );
}
