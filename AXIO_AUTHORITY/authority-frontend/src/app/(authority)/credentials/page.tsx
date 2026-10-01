"use client";

import { useState } from "react";
import type { Credential, CredentialState } from "@axio-authority/shared-types";
import { useApi } from "@/lib/use-api";
import { credentialsApi } from "@/lib/api/credentials-api";
import { newIdempotencyKey, AuthorityApiError } from "@/lib/api/client";
import { useCan } from "@/lib/auth/permissions";
import { useToast } from "@/components/ui";
import {
  AxioBadge,
  AxioButton,
  AxioConfirmDialog,
  AxioSelect,
  AxioStateSwitch,
  AxioTable,
  type AxioTableColumn,
  type BadgeTone,
} from "@/components/ui";

const stateTone: Record<CredentialState, BadgeTone> = {
  PENDING_ENROLLMENT: "warning",
  ACTIVE: "healthy",
  SUSPENDED: "offline",
  REVOKED: "neutral",
  EXPIRED: "degraded",
};

/**
 * /credentials — credential STATE only.
 * This page never displays passwords, hashes, private keys, tokens,
 * or any secret value. Enrollment creates a workflow, not a secret.
 */
export default function CredentialsPage() {
  const toast = useToast();
  const canRevoke = useCan("authority.credentials.revoke");
  const [state, setState] = useState<CredentialState | "">("");
  const [revoking, setRevoking] = useState<Credential | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  const { data, loading, error, retry } = useApi(
    () => credentialsApi.list({ state: state || undefined }),
    [state],
  );

  async function handleRevoke(reason: string) {
    if (!revoking) return;
    setConfirming(true);
    setActionError(undefined);
    try {
      await credentialsApi.revoke(revoking.id, {
        reason,
        idempotencyKey: newIdempotencyKey(),
      });
      toast(`Credential ${revoking.id} revoked.`, "success");
      setRevoking(null);
      retry();
    } catch (err) {
      setActionError(
        err instanceof AuthorityApiError ? err.message : "Revocation failed.",
      );
    } finally {
      setConfirming(false);
    }
  }

  const columns: AxioTableColumn<Credential>[] = [
    {
      key: "id",
      header: "Credential ID",
      className: "font-mono text-xs",
      render: (c) => c.id,
    },
    {
      key: "operator",
      header: "Operator ID",
      className: "font-mono text-xs whitespace-nowrap",
      render: (c) => c.operatorId,
    },
    {
      key: "partner",
      header: "Partner ID",
      className: "font-mono text-xs whitespace-nowrap",
      render: (c) => c.partnerId,
    },
    {
      key: "method",
      header: "Method",
      render: (c) => <AxioBadge tone="info">{c.method}</AxioBadge>,
    },
    {
      key: "state",
      header: "State",
      render: (c) => <AxioBadge tone={stateTone[c.state]}>{c.state}</AxioBadge>,
    },
    {
      key: "enrolled",
      header: "Enrolled",
      className: "whitespace-nowrap font-mono text-xs",
      render: (c) =>
        c.enrolledAt ? new Date(c.enrolledAt).toLocaleDateString() : "—",
    },
    {
      key: "actions",
      header: "Actions",
      render: (c) =>
        canRevoke && (c.state === "ACTIVE" || c.state === "SUSPENDED") ? (
          <AxioButton
            variant="danger"
            size="sm"
            onClick={() => {
              setActionError(undefined);
              setRevoking(c);
            }}
          >
            Revoke
          </AxioButton>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-600">
        Credential <strong>states</strong> are shown here. Secret values
        (passwords, hashes, keys, tokens) are never transmitted to or displayed
        in this console — by architecture, not by convention.
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <AxioSelect
          label="State filter"
          value={state}
          onChange={(e) => setState(e.target.value as CredentialState | "")}
          options={[
            { value: "", label: "All states" },
            { value: "PENDING_ENROLLMENT", label: "Pending enrollment" },
            { value: "ACTIVE", label: "Active" },
            { value: "SUSPENDED", label: "Suspended" },
            { value: "REVOKED", label: "Revoked" },
            { value: "EXPIRED", label: "Expired" },
          ]}
          className="w-56"
        />
      </div>

      <AxioStateSwitch
        loading={loading}
        error={error}
        empty={!loading && !error && (data?.data.length ?? 0) === 0}
        loadingLabel="Loading credentials…"
        onRetry={retry}
        emptyTitle="No credentials found"
        emptyDescription="No credentials match the current filter."
      >
        {data && (
          <AxioTable caption="Credential states" columns={columns} rows={data.data} />
        )}
      </AxioStateSwitch>

      {revoking && (
        <AxioConfirmDialog
          open={revoking !== null}
          title="Revoke credential"
          resourceName={`Credential for operator ${revoking.operatorId}`}
          resourceId={revoking.id}
          consequence="The credential is permanently revoked. The operator must complete a new enrollment to regain access. This action is written to the audit log."
          confirmLabel="Confirm revocation"
          onCancel={() => setRevoking(null)}
          onConfirm={handleRevoke}
          confirming={confirming}
          error={actionError}
        />
      )}
    </div>
  );
}
