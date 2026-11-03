"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import type { AuditAction, AuditResult } from "@axio-authority/shared-types";
import { useApi } from "@/lib/use-api";
import { auditApi } from "@/lib/api/audit-api";
import { useCan } from "@/lib/auth/permissions";
import {
  AxioAuditTable,
  AxioInput,
  AxioSelect,
  AxioStateSwitch,
} from "@/components/ui";

const AUTH_ACTIONS: AuditAction[] = [
  "AUTHORITY_LOGIN_SUCCESS",
  "AUTHORITY_LOGIN_FAILURE",
  "AUTHORITY_LOGOUT",
  "SESSION_REVOKED",
  "PARTNER_SESSIONS_REVOKED",
  "CREDENTIAL_ENROLLMENT_CREATED",
  "CREDENTIAL_ACTIVATED",
  "CREDENTIAL_REVOKED",
  "OPERATOR_RECOVERY_RESET",
  "SECURITY_EVENT_CREATED",
];

const PLATFORM_ACTIONS: AuditAction[] = [
  "PARTNER_CREATED",
  "PARTNER_ACTIVATED",
  "PARTNER_REACTIVATED",
  "PARTNER_SUSPENDED",
  "PARTNER_DECOMMISSIONED",
  "TENANT_CREATED",
  "TENANT_PROVISIONING_STARTED",
  "TENANT_PROVISIONING_COMPLETED",
  "TENANT_PROVISIONING_FAILED",
  "TENANT_SUSPENDED",
  "OPERATOR_CREATED",
  "OPERATOR_ACTIVATED",
  "OPERATOR_REACTIVATED",
  "OPERATOR_SUSPENDED",
  "OPERATOR_REVOKED",
  "OPERATOR_ROLE_CHANGED",
];

type AuditCategory = "ALL" | "AUTH" | "PLATFORM";

/** /audit — append-only Authority audit log. Satisfies SA-10. */
export default function AuditPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <AuditContent />
    </Suspense>
  );
}

function AuditContent() {
  const searchParams = useSearchParams();
  const canRead = useCan("authority.audit.read");

  const [category, setCategory] = useState<AuditCategory>("ALL");
  const [action, setAction] = useState<AuditAction | "">("");
  const [result, setResult] = useState<AuditResult | "">("");
  const [actor, setActor] = useState("");
  const partnerId = searchParams.get("partnerId") ?? "";

  const { data, loading, error, retry } = useApi(
    () =>
      auditApi.list({
        action: action || undefined,
        result: result || undefined,
        actor: actor || undefined,
        partnerId: partnerId || undefined,
        pageSize: 100,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, result, actor, partnerId],
  );

  const availableActions = useMemo(() => {
    if (category === "AUTH") return AUTH_ACTIONS;
    if (category === "PLATFORM") return PLATFORM_ACTIONS;
    return [...AUTH_ACTIONS, ...PLATFORM_ACTIONS];
  }, [category]);

  const displayedEvents = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter((ev) => {
      if (category === "AUTH" && !action && !AUTH_ACTIONS.includes(ev.action)) return false;
      if (category === "PLATFORM" && !action && !PLATFORM_ACTIONS.includes(ev.action)) return false;
      return true;
    });
  }, [data, category, action]);

  if (!canRead) {
    return (
      <AxioStateSwitch
        loading={false}
        error={{
          message:
            "You do not have permission to read the audit log (authority.audit.read). This access attempt has been logged.",
        }}
        empty={false}
      >
        <></>
      </AxioStateSwitch>
    );
  }

  return (
    <div className="space-y-4">
      {/* SA-10 Category Selector */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 gap-4">
        <button
          type="button"
          onClick={() => {
            setCategory("ALL");
            setAction("");
          }}
          className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${
            category === "ALL"
              ? "border-brand-600 text-brand-700 dark:text-brand-400"
              : "border-transparent text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          All Audit Events
        </button>
        <button
          type="button"
          onClick={() => {
            setCategory("AUTH");
            setAction("");
          }}
          className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${
            category === "AUTH"
              ? "border-brand-600 text-brand-700 dark:text-brand-400"
              : "border-transparent text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          Authentication & Sessions
        </button>
        <button
          type="button"
          onClick={() => {
            setCategory("PLATFORM");
            setAction("");
          }}
          className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${
            category === "PLATFORM"
              ? "border-brand-600 text-brand-700 dark:text-brand-400"
              : "border-transparent text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          Platform Administration
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <AxioSelect
          label="Action"
          value={action}
          onChange={(e) => setAction(e.target.value as AuditAction | "")}
          options={[
            {
              value: "",
              label:
                category === "ALL"
                  ? "All actions"
                  : `All ${category === "AUTH" ? "auth" : "admin"} actions`,
            },
            ...availableActions.map((act) => ({ value: act, label: act })),
          ]}
          className="w-72"
        />
        <AxioSelect
          label="Result"
          value={result}
          onChange={(e) => setResult(e.target.value as AuditResult | "")}
          options={[
            { value: "", label: "All results" },
            { value: "SUCCESS", label: "Success" },
            { value: "FAILURE", label: "Failure" },
            { value: "DENIED", label: "Denied" },
          ]}
          className="w-44"
        />
        <AxioInput
          label="Actor"
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          placeholder="Administrator email or ID"
          className="w-64"
        />
      </div>

      <AxioStateSwitch
        loading={loading}
        error={error}
        empty={!loading && !error && displayedEvents.length === 0}
        loadingLabel="Loading audit events…"
        onRetry={retry}
        emptyTitle="No audit events"
        emptyDescription="No audit events match the current category and filters."
      >
        <AxioAuditTable events={displayedEvents} />
      </AxioStateSwitch>
    </div>
  );
}
