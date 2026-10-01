"use client";

import type { Integration, IntegrationStatus } from "@axio-authority/shared-types";
import { useApi } from "@/lib/use-api";
import { integrationsApi } from "@/lib/api/integrations-api";
import {
  AxioBadge,
  AxioStateSwitch,
  AxioStatus,
  type BadgeTone,
} from "@/components/ui";

const statusTone: Record<IntegrationStatus, BadgeTone> = {
  NOT_CONFIGURED: "neutral",
  CONFIGURED: "info",
  CONNECTED: "healthy",
  DEGRADED: "degraded",
  DISCONNECTED: "offline",
};

/**
 * /integrations — platform integration states.
 * Status comes from the backend only. "Not configured" is a valid,
 * honest state — connectivity is never faked.
 */
export default function IntegrationsPage() {
  const { data, loading, error, retry } = useApi(() => integrationsApi.list(), []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Connection states for platform and interoperability integrations,
        reported by the backend. Unconfigured integrations are shown as such —
        never as connected.
      </p>

      <AxioStateSwitch
        loading={loading}
        error={error}
        empty={!loading && !error && (data?.length ?? 0) === 0}
        loadingLabel="Loading integrations…"
        onRetry={retry}
        emptyTitle="No integrations reported"
        emptyDescription="The backend did not report any integrations."
      >
        {data && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.map((i: Integration) => (
              <article
                key={i.id}
                className="rounded-md border border-slate-200 bg-white p-5 shadow-axio"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{i.name}</h3>
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-slate-500">
                      {i.category}
                    </p>
                  </div>
                  <AxioStatus state={i.health} />
                </div>
                <dl className="mt-4 space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Status</dt>
                    <dd>
                      <AxioBadge tone={statusTone[i.status]}>
                        {i.status.replace(/_/g, " ")}
                      </AxioBadge>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Version</dt>
                    <dd className="font-mono text-xs text-slate-700">{i.version ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Last sync</dt>
                    <dd className="font-mono text-xs text-slate-700">
                      {i.lastSynchronizedAt
                        ? new Date(i.lastSynchronizedAt).toLocaleString()
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Configuration</dt>
                    <dd className="text-slate-700">
                      {i.configured ? "Configured" : "Not configured"}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </AxioStateSwitch>
    </div>
  );
}
