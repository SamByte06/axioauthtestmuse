"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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

/** /audit — append-only Authority audit log. */
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
        pageSize: 50,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, result, actor, partnerId],
  );

  if (!canRead) {
    return (
      <AxioStateSwitch
        loading={false}
        error={{ message: "You do not have permission to read the audit log (authority.audit.read). This access attempt has been logged." }}
        empty={false}
      >
        <></>
      </AxioStateSwitch>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <AxioSelect
          label="Action"
          value={action}
          onChange={(e) => setAction(e.target.value as AuditAction | "")}
          options={[
            { value: "", label: "All actions" },
            { value: "PARTNER_CREATED", label: "PARTNER_CREATED" },
            { value: "PARTNER_SUSPENDED", label: "PARTNER_SUSPENDED" },
            { value: "OPERATOR_CREATED", label: "OPERATOR_CREATED" },
            { value: "OPERATOR_SUSPENDED", label: "OPERATOR_SUSPENDED" },
            { value: "OPERATOR_REVOKED", label: "OPERATOR_REVOKED" },
            { value: "TENANT_PROVISIONING_STARTED", label: "TENANT_PROVISIONING_STARTED" },
            { value: "TENANT_PROVISIONING_COMPLETED", label: "TENANT_PROVISIONING_COMPLETED" },
            { value: "TENANT_PROVISIONING_FAILED", label: "TENANT_PROVISIONING_FAILED" },
            { value: "CREDENTIAL_ENROLLMENT_CREATED", label: "CREDENTIAL_ENROLLMENT_CREATED" },
            { value: "CREDENTIAL_REVOKED", label: "CREDENTIAL_REVOKED" },
            { value: "AUTHORITY_LOGIN_SUCCESS", label: "AUTHORITY_LOGIN_SUCCESS" },
            { value: "AUTHORITY_LOGIN_FAILURE", label: "AUTHORITY_LOGIN_FAILURE" },
          ]}
          className="w-64"
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
        empty={!loading && !error && (data?.data.length ?? 0) === 0}
        loadingLabel="Loading audit events…"
        onRetry={retry}
        emptyTitle="No audit events"
        emptyDescription="No audit events match the current filters."
      >
        {data && <AxioAuditTable events={data.data} />}
      </AxioStateSwitch>
    </div>
  );
}
