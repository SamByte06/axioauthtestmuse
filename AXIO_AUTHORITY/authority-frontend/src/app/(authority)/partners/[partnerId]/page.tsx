"use client";

import Link from "next/link";
import { useState } from "react";
import type { Operator, Partner, PartnerStatus } from "@axio-authority/shared-types";
import { OPERATOR_TYPE_LABELS } from "@axio-authority/shared-types";
import { useApi } from "@/lib/use-api";
import { partnersApi } from "@/lib/api/partners-api";
import { operatorsApi } from "@/lib/api/operators-api";
import { newIdempotencyKey } from "@/lib/api/client";
import { useCan } from "@/lib/auth/permissions";
import { useToast } from "@/components/ui";
import {
  AxioBadge,
  AxioBreadcrumb,
  AxioButton,
  AxioConfirmDialog,
  AxioInput,
  AxioModal,
  AxioStateSwitch,
  AxioTimeline,
  type BadgeTone,
} from "@/components/ui";

const statusTone: Record<PartnerStatus, BadgeTone> = {
  ACTIVE: "healthy",
  PENDING: "warning",
  SUSPENDED: "offline",
  DECOMMISSIONED: "neutral",
};

/** /partners/[partnerId] — partner detail with lifecycle actions, account inventory, and session management. */
export default function PartnerDetailPage({
  params,
}: {
  params: { partnerId: string };
}) {
  const partnerId = decodeURIComponent(params.partnerId);
  const toast = useToast();

  const canActivate = useCan("authority.partner.activate");
  const canSuspend = useCan("authority.partner.suspend");
  const canRevokeSessions = useCan("authority.session.revoke");
  const canCreateOperator = useCan("authority.operator.create");

  const [confirmDialog, setConfirmDialog] = useState<"suspend" | "revokeSessions" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  // Provision Admin modal state (SA-3)
  const [provisionAdminOpen, setProvisionAdminOpen] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [provisioningAdmin, setProvisioningAdmin] = useState(false);
  const [provisionError, setProvisionError] = useState<string | undefined>();

  // Active tab for Account Inventory vs Organization Details
  const [activeTab, setActiveTab] = useState<"overview" | "inventory">("overview");

  const { data: partner, loading, error, retry } = useApi(
    () => partnersApi.get(partnerId),
    [partnerId],
  );

  const {
    data: operatorsData,
    loading: operatorsLoading,
    error: operatorsError,
    retry: retryOperators,
  } = useApi(() => operatorsApi.list({ partnerId, pageSize: 50 }), [partnerId]);

  async function handleActivate() {
    setActionError(undefined);
    try {
      await partnersApi.activate(partnerId);
      toast(`Hospital ${partnerId} activated successfully.`, "success");
      retry();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Activation failed.", "error");
    }
  }

  async function handleConfirm(reason: string) {
    if (!confirmDialog) return;
    setConfirming(true);
    setActionError(undefined);

    try {
      const idempotencyKey = newIdempotencyKey();
      if (confirmDialog === "suspend") {
        await partnersApi.suspend(partnerId, { reason, idempotencyKey });
        toast(`Hospital ${partnerId} suspended.`, "success");
      } else if (confirmDialog === "revokeSessions") {
        const summary = await partnersApi.revokeSessions(partnerId, { reason, idempotencyKey });
        toast(
          `Revoked ${summary.revokedSessionsCount} active sessions for hospital ${partnerId}.`,
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

  async function handleProvisionAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim()) {
      setProvisionError("Name and email are required.");
      return;
    }
    setProvisioningAdmin(true);
    setProvisionError(undefined);

    try {
      const op = await operatorsApi.create({
        partnerId,
        displayName: adminName.trim(),
        type: "A",
        email: adminEmail.trim(),
        idempotencyKey: newIdempotencyKey(),
      });
      toast(`Hospital Administrator ${op.id} created successfully.`, "success");
      setProvisionAdminOpen(false);
      setAdminName("");
      setAdminEmail("");
      retry();
      retryOperators();
    } catch (err) {
      setProvisionError(err instanceof Error ? err.message : "Provisioning failed.");
    } finally {
      setProvisioningAdmin(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AxioBreadcrumb
        items={[
          { label: "Partners", href: "/partners" },
          { label: partnerId },
        ]}
      />

      <AxioStateSwitch
        loading={loading}
        error={error}
        empty={!partner}
        loadingLabel="Loading partner…"
        onRetry={retry}
        emptyTitle="Partner not found"
      >
        {partner && (
          <>
            {/* Header with lifecycle and session actions */}
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-axio">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {partner.organizationName}
                </h2>
                <p className="mt-1 font-mono text-sm text-slate-600">{partner.id}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <AxioBadge tone={statusTone[partner.status]}>{partner.status}</AxioBadge>
                  <AxioBadge tone="info">{partner.partnerType}</AxioBadge>
                  {partner.testFixture && (
                    <AxioBadge tone="warning">TEST FIXTURE</AxioBadge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* SA-5: Activate / Reactivate */}
                {canActivate && (partner.status === "PENDING" || partner.status === "SUSPENDED") && (
                  <AxioButton size="sm" onClick={handleActivate}>
                    {partner.status === "PENDING" ? "Activate hospital" : "Reactivate hospital"}
                  </AxioButton>
                )}

                {/* SA-3: Provision Admin */}
                {canCreateOperator && (
                  <AxioButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setProvisionError(undefined);
                      setProvisionAdminOpen(true);
                    }}
                  >
                    Provision Admin
                  </AxioButton>
                )}

                {/* SA-9: Revoke active sessions */}
                {canRevokeSessions && (
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

                {/* SA-5: Suspend partner */}
                {canSuspend && partner.status === "ACTIVE" && (
                  <AxioButton
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setActionError(undefined);
                      setConfirmDialog("suspend");
                    }}
                  >
                    Suspend hospital
                  </AxioButton>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200">
              <nav className="-mb-px flex space-x-6">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={`border-b-2 py-3 text-sm font-medium ${
                    activeTab === "overview"
                      ? "border-brand-700 text-brand-700"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  Overview & Platform State
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("inventory")}
                  className={`border-b-2 py-3 text-sm font-medium ${
                    activeTab === "inventory"
                      ? "border-brand-700 text-brand-700"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  Account Inventory ({operatorsData?.total ?? partner.operatorCount})
                </button>
              </nav>
            </div>

            {activeTab === "overview" && (
              <>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <DetailCard title="Organization">
                    <DetailRow label="Organization" value={partner.organizationName} />
                    <DetailRow label="Partner type" value={partner.partnerType} />
                    <DetailRow label="State / UT" value={partner.state} />
                    <DetailRow label="Country" value={partner.country} />
                    <DetailRow
                      label="Isolation"
                      value={partner.isolationMode === "SHARED" ? "Shared" : "Dedicated database"}
                    />
                  </DetailCard>
                  <DetailCard title="Platform state">
                    <DetailRow label="Hospital / Partner ID" value={partner.id} mono />
                    <DetailRow label="Tenant ID" value={partner.tenantId ?? "—"} mono />
                    <DetailRow
                      label="Hospital Administrators"
                      value={partner.adminCount !== undefined ? String(partner.adminCount) : "Not reported by backend"}
                    />
                    <DetailRow
                      label="Employee Accounts"
                      value={partner.employeeCount !== undefined ? String(partner.employeeCount) : "Not reported by backend"}
                    />
                    <DetailRow label="Total Accounts" value={String(partner.operatorCount)} />
                    <DetailRow label="Created" value={new Date(partner.createdAt).toLocaleString()} />
                    <DetailRow label="Updated" value={new Date(partner.updatedAt).toLocaleString()} />
                  </DetailCard>
                </div>

                <DetailCard title="Lifecycle">
                  <AxioTimeline
                    items={[
                      {
                        id: "created",
                        title: "Hospital registered",
                        timestamp: new Date(partner.createdAt).toLocaleString(),
                        tone: "info",
                      },
                      {
                        id: "status",
                        title: `Current status: ${partner.status}`,
                        timestamp: new Date(partner.updatedAt).toLocaleString(),
                        tone:
                          partner.status === "ACTIVE"
                            ? "healthy"
                            : partner.status === "SUSPENDED"
                              ? "offline"
                              : "warning",
                        description: "Full lifecycle history is recorded in the append-only audit log.",
                      },
                    ]}
                  />
                  <Link
                    href={`/audit?partnerId=${encodeURIComponent(partner.id)}`}
                    className="mt-4 inline-block text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline"
                  >
                    View audit events for this hospital →
                  </Link>
                </DetailCard>
              </>
            )}

            {/* SA-6: Account Inventory Tab */}
            {activeTab === "inventory" && (
              <section aria-labelledby="inventory-heading" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 id="inventory-heading" className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                    Hospital Account Inventory
                  </h3>
                  {canCreateOperator && (
                    <AxioButton
                      size="sm"
                      onClick={() => {
                        setProvisionError(undefined);
                        setProvisionAdminOpen(true);
                      }}
                    >
                      Provision Administrator
                    </AxioButton>
                  )}
                </div>

                <AxioStateSwitch
                  loading={operatorsLoading}
                  error={operatorsError}
                  empty={!operatorsData || operatorsData.data.length === 0}
                  loadingLabel="Loading account inventory…"
                  onRetry={retryOperators}
                  emptyTitle="No accounts found"
                  emptyDescription="No staff or administrator accounts are registered for this hospital."
                >
                  {operatorsData && (
                    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-axio">
                      <table className="w-full text-left text-sm">
                        <caption className="sr-only">Hospital Staff and Administrator Accounts</caption>
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Operator ID
                            </th>
                            <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Display Name
                            </th>
                            <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Role / Type
                            </th>
                            <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Status
                            </th>
                            <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Credential State
                            </th>
                            <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {operatorsData.data.map((op: Operator) => (
                            <tr key={op.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                              <td className="px-4 py-3 font-mono text-xs text-slate-900">
                                <Link
                                  href={`/operators/${encodeURIComponent(op.id)}`}
                                  className="text-brand-700 hover:text-brand-800 hover:underline"
                                >
                                  {op.id}
                                </Link>
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {op.displayName}
                              </td>
                              <td className="px-4 py-3">
                                <AxioBadge tone="info">
                                  {op.type} — {OPERATOR_TYPE_LABELS[op.type]}
                                </AxioBadge>
                              </td>
                              <td className="px-4 py-3">
                                <AxioBadge
                                  tone={
                                    op.status === "ACTIVE"
                                      ? "healthy"
                                      : op.status === "SUSPENDED"
                                        ? "offline"
                                        : "warning"
                                  }
                                >
                                  {op.status}
                                </AxioBadge>
                              </td>
                              <td className="px-4 py-3">
                                <AxioBadge tone="neutral">{op.credentialState}</AxioBadge>
                              </td>
                              <td className="px-4 py-3">
                                <Link
                                  href={`/operators/${encodeURIComponent(op.id)}`}
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
            )}
          </>
        )}
      </AxioStateSwitch>

      {/* Confirmation Dialog for Destructive Actions (SA-5, SA-9) */}
      {partner && confirmDialog && (
        <AxioConfirmDialog
          open={confirmDialog !== null}
          title={
            confirmDialog === "suspend"
              ? "Suspend hospital"
              : "Revoke all active hospital sessions"
          }
          resourceName={partner.organizationName}
          resourceId={partner.id}
          consequence={
            confirmDialog === "suspend"
              ? "This will prevent associated operators from accessing AxioVital services through this partner. The tenant data store is preserved. This action is audited."
              : "This immediately invalidates ALL active user and administrator sessions for this hospital. Staff will be forced to re-authenticate. This action is audited."
          }
          confirmLabel={
            confirmDialog === "suspend"
              ? "Confirm suspension"
              : "Revoke all sessions"
          }
          onCancel={() => setConfirmDialog(null)}
          onConfirm={handleConfirm}
          confirming={confirming}
          error={actionError}
        />
      )}

      {/* SA-3: Provision Administrator Modal */}
      <AxioModal
        open={provisionAdminOpen}
        title="Provision Hospital Administrator"
        onClose={() => setProvisionAdminOpen(false)}
      >
        <form onSubmit={handleProvisionAdmin} className="space-y-4">
          <p className="text-xs text-slate-600">
            Create an initial or additional Administrator account for{" "}
            <strong>{partner?.organizationName}</strong>. The backend generates a unique Operator ID
            with type Administrator (A).
          </p>
          <AxioInput
            label="Administrator Full Name"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            required
            placeholder="e.g. Dr. Ramesh Kumar"
          />
          <AxioInput
            label="Work Email"
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
            placeholder="e.g. admin@hospital.example"
          />
          {provisionError && (
            <p className="text-xs font-medium text-red-600">{provisionError}</p>
          )}
          <div className="flex justify-end gap-3 pt-3">
            <AxioButton
              type="button"
              variant="secondary"
              onClick={() => setProvisionAdminOpen(false)}
            >
              Cancel
            </AxioButton>
            <AxioButton type="submit" loading={provisioningAdmin}>
              Provision Administrator
            </AxioButton>
          </div>
        </form>
      </AxioModal>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-6 shadow-axio">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
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
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className={`text-right text-slate-900 ${mono ? "font-mono text-[13px]" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
