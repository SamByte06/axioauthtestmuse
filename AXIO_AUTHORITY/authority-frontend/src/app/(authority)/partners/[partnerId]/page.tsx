"use client";

import Link from "next/link";
import { useState } from "react";
import type { Partner } from "@axio-authority/shared-types";
import { useApi } from "@/lib/use-api";
import { partnersApi } from "@/lib/api/partners-api";
import { newIdempotencyKey } from "@/lib/api/client";
import { useCan } from "@/lib/auth/permissions";
import { useToast } from "@/components/ui";
import {
  AxioBadge,
  AxioBreadcrumb,
  AxioButton,
  AxioConfirmDialog,
  AxioStateSwitch,
  AxioTimeline,
} from "@/components/ui";

/** /partners/[partnerId] — partner detail with lifecycle actions. */
export default function PartnerDetailPage({
  params,
}: {
  params: { partnerId: string };
}) {
  const partnerId = decodeURIComponent(params.partnerId);
  const toast = useToast();
  const canSuspend = useCan("authority.partner.suspend");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  const { data: partner, loading, error, retry } = useApi(
    () => partnersApi.get(partnerId),
    [partnerId],
  );

  async function handleSuspend(reason: string) {
    setConfirming(true);
    setActionError(undefined);
    try {
      await partnersApi.suspend(partnerId, {
        reason,
        idempotencyKey: newIdempotencyKey(),
      });
      setConfirmOpen(false);
      toast(`Partner ${partnerId} suspended.`, "success");
      retry();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Suspension failed.",
      );
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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
            <PartnerHeader
              partner={partner}
              canSuspend={canSuspend}
              onSuspend={() => {
                setActionError(undefined);
                setConfirmOpen(true);
              }}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DetailCard title="Organization">
                <DetailRow label="Organization" value={partner.organizationName} />
                <DetailRow label="Partner type" value={partner.partnerType} />
                <DetailRow label="State / UT" value={partner.state} />
                <DetailRow label="Country" value={partner.country} />
                <DetailRow
                  label="Isolation"
                  value={
                    partner.isolationMode === "SHARED"
                      ? "Shared"
                      : "Dedicated database"
                  }
                />
              </DetailCard>
              <DetailCard title="Platform state">
                <DetailRow label="Partner ID" value={partner.id} mono />
                <DetailRow label="Tenant ID" value={partner.tenantId ?? "—"} mono />
                <DetailRow label="Operators" value={String(partner.operatorCount)} />
                <DetailRow label="Created" value={new Date(partner.createdAt).toLocaleString()} />
                <DetailRow label="Updated" value={new Date(partner.updatedAt).toLocaleString()} />
                {partner.testFixture && (
                  <p className="mt-2">
                    <AxioBadge tone="warning">
                      TEST FIXTURE — not a production partnership
                    </AxioBadge>
                  </p>
                )}
              </DetailCard>
            </div>
            <DetailCard title="Lifecycle">
              <AxioTimeline
                items={[
                  {
                    id: "created",
                    title: "Partner record created",
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
                    description:
                      "Full lifecycle history is available in the audit log.",
                  },
                ]}
              />
              <Link
                href={`/audit?partnerId=${encodeURIComponent(partner.id)}`}
                className="mt-4 inline-block text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline"
              >
                View audit events for this partner →
              </Link>
            </DetailCard>
          </>
        )}
      </AxioStateSwitch>

      {partner && (
        <AxioConfirmDialog
          open={confirmOpen}
          title="Suspend partner"
          resourceName={partner.organizationName}
          resourceId={partner.id}
          consequence="This will prevent associated operators from accessing AxioVital services through this partner. The tenant data store is preserved. This action is written to the audit log."
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

function PartnerHeader({
  partner,
  canSuspend,
  onSuspend,
}: {
  partner: Partner;
  canSuspend: boolean;
  onSuspend: () => void;
}) {
  const tone =
    partner.status === "ACTIVE"
      ? "healthy"
      : partner.status === "SUSPENDED"
        ? "offline"
        : partner.status === "PENDING"
          ? "warning"
          : "neutral";
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-slate-200 bg-white p-6 shadow-axio">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          {partner.organizationName}
        </h2>
        <p className="mt-1 font-mono text-sm text-slate-600">{partner.id}</p>
        <p className="mt-2">
          <AxioBadge tone={tone}>{partner.status}</AxioBadge>
        </p>
      </div>
      {canSuspend && partner.status === "ACTIVE" && (
        <AxioButton variant="danger" size="sm" onClick={onSuspend}>
          Suspend partner
        </AxioButton>
      )}
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
