"use client";

import Link from "next/link";
import { useState } from "react";
import {
  OPERATOR_TYPE_LABELS,
  type Operator,
} from "@axio-authority/shared-types";
import { useApi } from "@/lib/use-api";
import { operatorsApi } from "@/lib/api/operators-api";
import { newIdempotencyKey } from "@/lib/api/client";
import { useCan } from "@/lib/auth/permissions";
import { useToast } from "@/components/ui";
import {
  AxioBadge,
  AxioBreadcrumb,
  AxioButton,
  AxioConfirmDialog,
  AxioStateSwitch,
  type BadgeTone,
} from "@/components/ui";

const statusTone: Record<Operator["status"], BadgeTone> = {
  PENDING: "warning",
  ACTIVE: "healthy",
  SUSPENDED: "offline",
  REVOKED: "neutral",
};

/** /operators/[operatorId] — operator detail with suspend / revoke. */
export default function OperatorDetailPage({
  params,
}: {
  params: { operatorId: string };
}) {
  const operatorId = decodeURIComponent(params.operatorId);
  const toast = useToast();
  const canSuspend = useCan("authority.operator.suspend");
  const canRevoke = useCan("authority.operator.revoke");

  const [dialog, setDialog] = useState<"suspend" | "revoke" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  const { data: operator, loading, error, retry } = useApi(
    () => operatorsApi.get(operatorId),
    [operatorId],
  );

  async function handleConfirm(reason: string) {
    if (!dialog) return;
    setConfirming(true);
    setActionError(undefined);
    try {
      const request = { reason, idempotencyKey: newIdempotencyKey() };
      if (dialog === "suspend") {
        await operatorsApi.suspend(operatorId, request);
        toast(`Operator ${operatorId} suspended.`, "success");
      } else {
        await operatorsApi.revoke(operatorId, request);
        toast(`Operator ${operatorId} revoked.`, "success");
      }
      setDialog(null);
      retry();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AxioBreadcrumb
        items={[{ label: "Operators", href: "/operators" }, { label: operatorId }]}
      />

      <AxioStateSwitch
        loading={loading}
        error={error}
        empty={!operator}
        loadingLabel="Loading operator…"
        onRetry={retry}
        emptyTitle="Operator not found"
      >
        {operator && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-axio">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {operator.displayName}
                </h2>
                <p className="mt-1 font-mono text-sm text-slate-600">{operator.id}</p>
                <p className="mt-2 flex flex-wrap gap-2">
                  <AxioBadge tone={statusTone[operator.status]}>{operator.status}</AxioBadge>
                  <AxioBadge tone="info">
                    {operator.type} — {OPERATOR_TYPE_LABELS[operator.type]}
                  </AxioBadge>
                  <AxioBadge tone="neutral">{operator.credentialState}</AxioBadge>
                </p>
              </div>
              <div className="flex gap-2">
                {canSuspend && operator.status === "ACTIVE" && (
                  <AxioButton variant="secondary" size="sm" onClick={() => { setActionError(undefined); setDialog("suspend"); }}>
                    Suspend
                  </AxioButton>
                )}
                {canRevoke && operator.status !== "REVOKED" && (
                  <AxioButton variant="danger" size="sm" onClick={() => { setActionError(undefined); setDialog("revoke"); }}>
                    Revoke
                  </AxioButton>
                )}
              </div>
            </div>

            <section className="rounded-md border border-slate-200 bg-white p-6 shadow-axio">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Identity
              </h3>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <DetailRow label="Operator ID" value={operator.id} mono />
                <DetailRow label="Partner ID" value={operator.partnerId} mono />
                <DetailRow label="Email" value={operator.email} />
                <DetailRow
                  label="Last active"
                  value={operator.lastActiveAt ? new Date(operator.lastActiveAt).toLocaleString() : "—"}
                />
                <DetailRow label="Created" value={new Date(operator.createdAt).toLocaleString()} />
              </dl>
              <Link
                href={`/credentials?operatorId=${encodeURIComponent(operator.id)}`}
                className="mt-4 inline-block text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline"
              >
                View credentials for this operator →
              </Link>
            </section>
          </>
        )}
      </AxioStateSwitch>

      {operator && dialog && (
        <AxioConfirmDialog
          open={dialog !== null}
          title={dialog === "suspend" ? "Suspend operator" : "Revoke operator"}
          resourceName={operator.displayName}
          resourceId={operator.id}
          consequence={
            dialog === "suspend"
              ? "The operator will be unable to sign in to AxioVital services. Their credential is suspended and the action is audited. Suspension can be lifted by an authorized administrator."
              : "Revocation is terminal: the operator identity and its credentials are permanently revoked. This cannot be undone. The action is written to the audit log."
          }
          confirmLabel={dialog === "suspend" ? "Confirm suspension" : "Confirm revocation"}
          onCancel={() => setDialog(null)}
          onConfirm={handleConfirm}
          confirming={confirming}
          error={actionError}
        />
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-slate-900 ${mono ? "font-mono text-[13px]" : ""}`}>{value}</dd>
    </div>
  );
}
