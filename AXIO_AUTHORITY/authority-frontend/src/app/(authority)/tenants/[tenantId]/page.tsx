"use client";

import { useState } from "react";
import type { Tenant } from "@axio-authority/shared-types";
import { useApi } from "@/lib/use-api";
import { tenantsApi } from "@/lib/api/tenants-api";
import { newIdempotencyKey, AuthorityApiError } from "@/lib/api/client";
import { useCan } from "@/lib/auth/permissions";
import { useToast } from "@/components/ui";
import {
  AxioBadge,
  AxioBreadcrumb,
  AxioButton,
  AxioConfirmDialog,
  AxioStateSwitch,
  AxioTimeline,
  type BadgeTone,
} from "@/components/ui";

const lifecycleTone: Record<Tenant["lifecycle"], BadgeTone> = {
  CREATING: "info",
  PROVISIONING: "warning",
  READY: "healthy",
  ACTIVE: "healthy",
  SUSPENDED: "offline",
  DECOMMISSIONING: "degraded",
  DECOMMISSIONED: "neutral",
};

/** /tenants/[tenantId] — tenant detail, provisioning control, lifecycle. */
export default function TenantDetailPage({
  params,
}: {
  params: { tenantId: string };
}) {
  const tenantId = decodeURIComponent(params.tenantId);
  const toast = useToast();
  const canProvision = useCan("authority.tenant.provision");
  const canSuspend = useCan("authority.tenant.suspend");

  const [provisioning, setProvisioning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  const { data: tenant, loading, error, retry } = useApi(
    () => tenantsApi.get(tenantId),
    [tenantId],
  );

  async function handleProvision() {
    setProvisioning(true);
    try {
      const updated = await tenantsApi.provision(tenantId);
      toast(
        `Provisioning ${updated.provisioningStatus.state === "FAILED" ? "failed" : "started"} for tenant ${tenantId}.`,
        updated.provisioningStatus.state === "FAILED" ? "error" : "success",
        updated.provisioningStatus.correlationId,
      );
      retry();
    } catch (err) {
      toast(
        err instanceof AuthorityApiError ? err.message : "Provisioning request failed.",
        "error",
        err instanceof AuthorityApiError ? err.correlationId : undefined,
      );
    } finally {
      setProvisioning(false);
    }
  }

  async function handleSuspend(reason: string) {
    setConfirming(true);
    setActionError(undefined);
    try {
      await tenantsApi.suspend(tenantId, {
        reason,
        idempotencyKey: newIdempotencyKey(),
      });
      setConfirmOpen(false);
      toast(`Tenant ${tenantId} suspended.`, "success");
      retry();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Suspension failed.");
    } finally {
      setConfirming(false);
    }
  }

  const showProvision =
    tenant &&
    (tenant.provisioningStatus.state === "NOT_STARTED" ||
      tenant.provisioningStatus.state === "FAILED" ||
      tenant.provisioningStatus.state === "ROLLED_BACK");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AxioBreadcrumb
        items={[{ label: "Tenants", href: "/tenants" }, { label: tenantId }]}
      />

      <AxioStateSwitch
        loading={loading}
        error={error}
        empty={!tenant}
        loadingLabel="Loading tenant…"
        onRetry={retry}
        emptyTitle="Tenant not found"
      >
        {tenant && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-axio">
              <div>
                <h2 className="font-mono text-lg font-semibold text-slate-900">
                  {tenant.id}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {tenant.organizationName} · {tenant.partnerId}
                </p>
                <p className="mt-2 flex flex-wrap gap-2">
                  <AxioBadge tone={lifecycleTone[tenant.lifecycle]}>
                    {tenant.lifecycle}
                  </AxioBadge>
                  <AxioBadge tone="info">
                    {tenant.isolationMode === "SHARED" ? "Shared" : "Dedicated database"}
                  </AxioBadge>
                </p>
              </div>
              <div className="flex gap-2">
                {canProvision && showProvision && (
                  <AxioButton
                    size="sm"
                    onClick={handleProvision}
                    loading={provisioning}
                  >
                    {tenant.provisioningStatus.state === "NOT_STARTED"
                      ? "Start provisioning"
                      : "Retry provisioning"}
                  </AxioButton>
                )}
                {canSuspend && tenant.status === "ACTIVE" && (
                  <AxioButton
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setActionError(undefined);
                      setConfirmOpen(true);
                    }}
                  >
                    Suspend tenant
                  </AxioButton>
                )}
              </div>
            </div>

            <section className="rounded-md border border-slate-200 bg-white p-6 shadow-axio">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">
                Provisioning status
              </h3>
              <AxioTimeline
                items={[
                  {
                    id: "state",
                    title: `State: ${tenant.provisioningStatus.state}`,
                    timestamp: tenant.provisioningStatus.startedAt
                      ? new Date(tenant.provisioningStatus.startedAt).toLocaleString()
                      : undefined,
                    tone:
                      tenant.provisioningStatus.state === "COMPLETED"
                        ? "healthy"
                        : tenant.provisioningStatus.state === "FAILED"
                          ? "offline"
                          : tenant.provisioningStatus.state === "IN_PROGRESS"
                            ? "warning"
                            : "neutral",
                    description: tenant.provisioningStatus.message ?? (
                      <span>
                        Provisioning is executed by the backend provisioning
                        service. The browser never touches the database
                        infrastructure.
                      </span>
                    ),
                  },
                  ...(tenant.provisioningStatus.correlationId
                    ? [
                        {
                          id: "correlation",
                          title: "Correlation ID",
                          description: (
                            <span className="font-mono text-xs">
                              {tenant.provisioningStatus.correlationId}
                            </span>
                          ),
                          tone: "info" as const,
                        },
                      ]
                    : []),
                ]}
              />
            </section>
          </>
        )}
      </AxioStateSwitch>

      {tenant && (
        <AxioConfirmDialog
          open={confirmOpen}
          title="Suspend tenant"
          resourceName={tenant.organizationName}
          resourceId={tenant.id}
          consequence="Operators of this tenant will be unable to access AxioVital services. Data is preserved. This action is written to the audit log."
          confirmLabel="Confirm suspension"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleSuspend}
          confirming={confirming}
          error={actionError}
        />
      )}
    </div>
  );
}
