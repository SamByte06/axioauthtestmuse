"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth/session";
import { isBackendConfigured } from "@/lib/api/client";
import { AxioBadge } from "@/components/ui";

type TableDensity = "comfortable" | "compact";

export default function SettingsPage() {
  const session = useSession();
  const apiBase = process.env.NEXT_PUBLIC_AUTHORITY_API_BASE_URL ?? "(not set)";
  const environment = process.env.NEXT_PUBLIC_AUTHORITY_ENVIRONMENT ?? "development";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-axio">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Console configuration
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-slate-500">Backend API base URL</dt>
            <dd className="font-mono text-[13px] text-slate-900">{apiBase}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-slate-500">Environment</dt>
            <dd>
              <AxioBadge tone="neutral">{environment}</AxioBadge>
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-slate-500">Backend connection</dt>
            <dd>
              <AxioBadge tone={isBackendConfigured() ? "healthy" : "warning"}>
                {isBackendConfigured() ? "Configured" : "Not configured"}
              </AxioBadge>
            </dd>
          </div>
        </dl>
      </section>

      <ConsolePreferences />

      {session && (
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-axio">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
            Your Authority session
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-slate-500">Administrator</dt>
              <dd className="text-slate-900">{session.displayName}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-slate-500">Email</dt>
              <dd className="text-slate-900">{session.email}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-slate-500">Roles</dt>
              <dd className="text-right">
                {session.roles.map((r) => (
                  <AxioBadge key={r} tone="info" mono className="ml-1">
                    {r}
                  </AxioBadge>
                ))}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-slate-500">Session expires</dt>
              <dd className="font-mono text-[13px] text-slate-900">
                {new Date(session.expiresAt).toLocaleString()}
              </dd>
            </div>
          </dl>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-brand-700 hover:text-brand-800">
              View granted permissions ({session.permissions.length})
            </summary>
            <ul className="mt-2 flex flex-wrap gap-1">
              {session.permissions.map((p) => (
                <li key={p}>
                  <AxioBadge tone="neutral" mono>
                    {p}
                  </AxioBadge>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}

function ConsolePreferences() {
  const [density, setDensity] = useState<TableDensity>("comfortable");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedDensity = window.localStorage.getItem("authority.tableDensity");
    const savedMotion = window.localStorage.getItem("authority.reduceMotion");
    if (savedDensity === "compact" || savedDensity === "comfortable") {
      setDensity(savedDensity);
    }
    setReduceMotion(savedMotion === "true");
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.tableDensity = density;
    document.documentElement.dataset.motion = reduceMotion ? "reduce" : "full";
    window.localStorage.setItem("authority.tableDensity", density);
    window.localStorage.setItem("authority.reduceMotion", String(reduceMotion));
  }, [density, reduceMotion, ready]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-6 shadow-axio">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
        Interface preferences
      </h2>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label htmlFor="table-density" className="text-sm text-slate-700">
            Table density
          </label>
          <select
            id="table-density"
            value={density}
            onChange={(event) => setDensity(event.target.value as TableDensity)}
            className="h-10 min-w-44 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span id="reduce-motion-label" className="text-sm text-slate-700">
            Reduce motion
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={reduceMotion}
            aria-labelledby="reduce-motion-label"
            onClick={() => setReduceMotion((value) => !value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            {reduceMotion ? "On" : "Off"}
          </button>
        </div>
      </div>
    </section>
  );
}
