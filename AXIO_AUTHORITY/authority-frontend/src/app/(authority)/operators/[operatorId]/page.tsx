"use client";

import Link from "next/link";
import { useState } from "react";
import {
  OPERATOR_TYPE_LABELS,
  type Operator,
  type OperatorType,
  type EnrollmentResponse,
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
  AxioModal,
  AxioSelect,
  AxioStateSwitch,
  type BadgeTone,
} from "@/components/ui";

const statusTone: Record<Operator["status"], BadgeTone> = {
  PENDING: "warning",
  ACTIVE: "healthy",
  SUSPENDED: "offline",
  REVOKED: "neutral",
};

/** /operators/[operatorId] — operator detail with suspend, reactivate, change role, session revocation, and recovery reset. */
export default function OperatorDetailPage({
  params,
}: {
  params: { operatorId: string };
}) {
  const operatorId = decodeURIComponent(params.operatorId);
  const toast = useToast();

  const canSuspend = useCan("authority.operator.suspend");
  const canReactivate = useCan("authority.operator.activate");
  const canUpdateRole = useCan("authority.operator.update");
  const canRevoke = useCan("authority.operator.revoke");
  const canRevokeSessions = useCan("authority.session.revoke");
  const canEnroll = useCan("authority.credentials.enroll");

  const [confirmDialog, setConfirmDialog] = useState<"suspend" | "reactivate" | "revoke" | "revokeSessions" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  // Role Change Modal state
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<OperatorType>("S");
  const [updatingRole, setUpdatingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | undefined>();

  // Activation Invitation / Recovery Reset Modal state (SA-4, SA-8)
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<number>(24);
  const [resettingRecovery, setResettingRecovery] = useState(false);
  const [invitationResult, setInvitationResult] = useState<EnrollmentResponse | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | undefined>();

  const { data: operator, loading, error, retry } = useApi(
    () => operatorsApi.get(operatorId),
    [operatorId],
  );

  async function handleConfirmAction(reason: string) {
    if (!confirmDialog) return;
    setConfirming(true);
    setActionError(undefined);

    try {
      const idempotencyKey = newIdempotencyKey();
      if (confirmDialog === "suspend") {
        await operatorsApi.suspend(operatorId, { reason, idempotencyKey });
        toast(`Operator ${operatorId} suspended.`, "success");
      } else if (confirmDialog === "reactivate") {
        await operatorsApi.reactivate(operatorId, { reason, idempotencyKey });
        toast(`Operator ${operatorId} reactivated successfully.`, "success");
      } else if (confirmDialog === "revoke") {
        await operatorsApi.revoke(operatorId, { reason, idempotencyKey });
        toast(`Operator ${operatorId} revoked permanently.`, "success");
      } else if (confirmDialog === "revokeSessions") {
        const summary = await operatorsApi.revokeSessions(operatorId, { reason, idempotencyKey });
        toast(
          `Revoked ${summary.revokedSessionsCount} active sessions for ${operatorId}.`,
          "success",
          summary.correlationId,
        );
      }
      setConfirmDialog(null);
      retry();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleRoleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setUpdatingRole(true);
    setRoleError(undefined);

    try {
      await operatorsApi.updateRole(operatorId, { type: selectedRole });
      toast(`Operator role updated to ${OPERATOR_TYPE_LABELS[selectedRole]}.`, "success");
      setRoleModalOpen(false);
      retry();
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Role update failed.");
    } finally {
      setUpdatingRole(false);
    }
  }

  async function handleResetRecovery(e: React.FormEvent) {
    e.preventDefault();
    setResettingRecovery(true);
    setRecoveryError(undefined);

    try {
      const res = await operatorsApi.resetCredential(operatorId, {
        expiresInHours,
        idempotencyKey: newIdempotencyKey(),
      });
      setInvitationResult(res);
      toast(`New single-use activation invitation issued for ${operatorId}.`, "success");
      retry();
    } catch (err) {
      setRecoveryError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setResettingRecovery(false);
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
                <div className="mt-2 flex flex-wrap gap-2">
                  <AxioBadge tone={statusTone[operator.status]}>{operator.status}</AxioBadge>
                  <AxioBadge tone="info">
                    {operator.type} — {OPERATOR_TYPE_LABELS[operator.type]}
                  </AxioBadge>
                  <AxioBadge tone="neutral">{operator.credentialState}</AxioBadge>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {/* SA-7: Reactivate operator */}
                {canReactivate && operator.status === "SUSPENDED" && (
                  <AxioButton
                    size="sm"
                    onClick={() => {
                      setActionError(undefined);
                      setConfirmDialog("reactivate");
                    }}
                  >
                    Reactivate account
                  </AxioButton>
                )}

                {/* Assign roles: Change role */}
                {canUpdateRole && operator.status !== "REVOKED" && (
                  <AxioButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedRole(operator.type);
                      setRoleError(undefined);
                      setRoleModalOpen(true);
                    }}
                  >
                    Change role
                  </AxioButton>
                )}

                {/* SA-4 / SA-8: Reissue activation invitation / Reset recovery */}
                {canEnroll && operator.status !== "REVOKED" && (
                  <AxioButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setInvitationResult(null);
                      setRecoveryError(undefined);
                      setRecoveryModalOpen(true);
                    }}
                  >
                    Reissue invitation
                  </AxioButton>
                )}

                {/* SA-9: Revoke active sessions */}
                {canRevokeSessions && operator.status !== "REVOKED" && (
                  <AxioButton
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setActionError(undefined);
                      setConfirmDialog("revokeSessions");
                    }}
                  >
                    Revoke active sessions
                  </AxioButton>
                )}

                {/* SA-7: Suspend operator */}
                {canSuspend && operator.status === "ACTIVE" && (
                  <AxioButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setActionError(undefined);
                      setConfirmDialog("suspend");
                    }}
                  >
                    Suspend
                  </AxioButton>
                )}

                {/* Revoke account (terminal) */}
                {canRevoke && operator.status !== "REVOKED" && (
                  <AxioButton
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setActionError(undefined);
                      setConfirmDialog("revoke");
                    }}
                  >
                    Revoke
                  </AxioButton>
                )}
              </div>
            </div>

            <section className="rounded-md border border-slate-200 bg-white p-6 shadow-axio">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Identity & Access State
              </h3>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <DetailRow label="Operator ID" value={operator.id} mono />
                <DetailRow label="Hospital / Partner ID" value={operator.partnerId} mono />
                <DetailRow label="Email" value={operator.email} />
                <DetailRow
                  label="Role"
                  value={`${operator.type} — ${OPERATOR_TYPE_LABELS[operator.type]}`}
                />
                <DetailRow
                  label="Last active"
                  value={operator.lastActiveAt ? new Date(operator.lastActiveAt).toLocaleString() : "—"}
                />
                <DetailRow label="Created" value={new Date(operator.createdAt).toLocaleString()} />
              </dl>
              <div className="mt-4 flex gap-4">
                <Link
                  href={`/credentials?operatorId=${encodeURIComponent(operator.id)}`}
                  className="text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline"
                >
                  View credential state →
                </Link>
                <Link
                  href={`/partners/${encodeURIComponent(operator.partnerId)}`}
                  className="text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline"
                >
                  View hospital organization →
                </Link>
              </div>
            </section>
          </>
        )}
      </AxioStateSwitch>

      {/* Confirmation Dialog for Destructive Actions (SA-7, SA-9) */}
      {operator && confirmDialog && (
        <AxioConfirmDialog
          open={confirmDialog !== null}
          title={
            confirmDialog === "suspend"
              ? "Suspend operator account"
              : confirmDialog === "reactivate"
                ? "Reactivate operator account"
                : confirmDialog === "revokeSessions"
                  ? "Revoke active sessions"
                  : "Revoke operator permanently"
          }
          resourceName={operator.displayName}
          resourceId={operator.id}
          consequence={
            confirmDialog === "suspend"
              ? "The operator will be unable to sign in to AxioVital services. Their active credentials are suspended and this action is audited."
              : confirmDialog === "reactivate"
                ? "The operator will regain sign-in privileges to AxioVital services. A justification of at least 10 characters is required and audited."
                : confirmDialog === "revokeSessions"
                  ? "This will immediately terminate all active sessions and refresh tokens for this operator account across all devices. The action is audited."
                  : "Revocation is terminal: the operator identity and its credentials are permanently revoked. This cannot be undone. The action is audited."
          }
          confirmLabel={
            confirmDialog === "suspend"
              ? "Confirm suspension"
              : confirmDialog === "reactivate"
                ? "Reactivate account"
                : confirmDialog === "revokeSessions"
                  ? "Revoke sessions"
                  : "Confirm revocation"
          }
          onCancel={() => setConfirmDialog(null)}
          onConfirm={handleConfirmAction}
          confirming={confirming}
          error={actionError}
        />
      )}

      {/* Change Role Modal */}
      {operator && (
        <AxioModal
          open={roleModalOpen}
          title={`Change Role: ${operator.displayName}`}
          onClose={() => setRoleModalOpen(false)}
        >
          <form onSubmit={handleRoleUpdate} className="space-y-4">
            <p className="text-xs text-slate-600">
              Select the new IAM role for this operator. Role assignments determine permissions in
              the hospital operating environment and are audited server-side.
            </p>
            <AxioSelect
              label="Operator Role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as OperatorType)}
              options={[
                { value: "A", label: "A — Administrator" },
                { value: "C", label: "C — Clinician" },
                { value: "S", label: "S — Staff" },
                { value: "T", label: "T — Technician" },
                { value: "D", label: "D — Doctor" },
              ]}
            />
            {roleError && (
              <p className="text-xs font-medium text-red-600">{roleError}</p>
            )}
            <div className="flex justify-end gap-3 pt-3">
              <AxioButton
                type="button"
                variant="secondary"
                onClick={() => setRoleModalOpen(false)}
              >
                Cancel
              </AxioButton>
              <AxioButton type="submit" loading={updatingRole}>
                Update Role
              </AxioButton>
            </div>
          </form>
        </AxioModal>
      )}

      {/* Reissue Activation Invitation / Reset Recovery Modal (SA-4, SA-8) */}
      {operator && (
        <AxioModal
          open={recoveryModalOpen}
          title={`Activation & Recovery: ${operator.displayName}`}
          onClose={() => setRecoveryModalOpen(false)}
        >
          {invitationResult ? (
            <div className="space-y-4">
              <div className="rounded-md border border-green-200 bg-green-50 p-4">
                <h4 className="text-sm font-semibold text-green-900">
                  Single-Use Activation Invitation Issued
                </h4>
                <p className="mt-1 text-xs text-green-800">
                  Share this invitation reference with the operator. In accordance with zero-knowledge
                  security principles, no plaintext passwords or secrets are generated or displayed.
                </p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <p>
                  <strong>Operator ID:</strong>{" "}
                  <span className="font-mono">{operator.id}</span>
                </p>
                <p>
                  <strong>One-Time Invitation Reference:</strong>{" "}
                  <span className="font-mono text-brand-800 font-semibold">
                    {invitationResult.enrollmentReference}
                  </span>
                </p>
                <p>
                  <strong>Expires At:</strong>{" "}
                  {new Date(invitationResult.expiresAt).toLocaleString()}
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <AxioButton onClick={() => setRecoveryModalOpen(false)}>Done</AxioButton>
              </div>
            </div>
          ) : (
            <form onSubmit={handleResetRecovery} className="space-y-4">
              <p className="text-xs text-slate-600">
                Issue a secure, single-use activation invitation or reset account recovery for{" "}
                <strong>{operator.displayName}</strong>. This invalidates any prior unused invitations
                and resets credential onboarding state.
              </p>
              <AxioSelect
                label="Invitation Validity Period"
                value={String(expiresInHours)}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                options={[
                  { value: "24", label: "24 hours (1 day)" },
                  { value: "48", label: "48 hours (2 days)" },
                  { value: "72", label: "72 hours (3 days)" },
                  { value: "168", label: "168 hours (7 days)" },
                ]}
              />
              {recoveryError && (
                <p className="text-xs font-medium text-red-600">{recoveryError}</p>
              )}
              <div className="flex justify-end gap-3 pt-3">
                <AxioButton
                  type="button"
                  variant="secondary"
                  onClick={() => setRecoveryModalOpen(false)}
                >
                  Cancel
                </AxioButton>
                <AxioButton type="submit" loading={resettingRecovery}>
                  Issue Single-Use Invitation
                </AxioButton>
              </div>
            </form>
          )}
        </AxioModal>
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
