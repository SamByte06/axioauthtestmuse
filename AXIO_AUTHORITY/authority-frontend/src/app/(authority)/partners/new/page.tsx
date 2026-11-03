"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createPartnerFormSchema, type CreatePartnerForm } from "@axio-authority/validation";
import type { CreatePartnerResponse } from "@axio-authority/shared-types";
import { partnersApi } from "@/lib/api/partners-api";
import {
  AuthorityApiError,
  BackendNotConfiguredError,
  newIdempotencyKey,
} from "@/lib/api/client";
import { useCan } from "@/lib/auth/permissions";
import { useToast } from "@/components/ui";
import {
  AxioBreadcrumb,
  AxioButton,
  AxioErrorState,
  AxioIdDisplay,
  AxioInput,
  AxioModal,
  AxioSelect,
  AxioStateSwitch,
} from "@/components/ui";

/**
 * /partners/new — Create Hospital / Partner workflow.
 *
 * Implements D6 acceptance milestone:
 * 1. Connects through proxy to configured backend (/api/v1/admin/hospitals).
 * 2. Authenticated platform administrator only (authority.partner.create).
 * 3. Form collects hospital name, state, isolation mode, and admin details.
 * 4. Submits with Idempotency-Key; disabled while pending; no auto-retry on failure.
 * 5. Displays backend-generated Partner ID, Tenant ID, and Operator ID verbatim.
 * 6. Provides D3 secure administrator enrollment step: masked single-use URL with Copy.
 */

type Phase = "form" | "review" | "submitting" | "done" | "failed";

export default function NewPartnerPage() {
  const router = useRouter();
  const toast = useToast();
  const canCreate = useCan("authority.partner.create");

  const [phase, setPhase] = useState<Phase>("form");
  const [form, setForm] = useState<CreatePartnerForm>({
    organizationName: "",
    partnerType: "HOSPITAL",
    state: "",
    country: "India",
    isolationMode: "DEDICATED_DATABASE",
    adminFullName: "",
    adminEmail: "",
    adminPhone: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CreatePartnerResponse | null>(null);
  const [failure, setFailure] = useState<{ message: string; correlationId?: string } | null>(null);
  const [revealEnrollment, setRevealEnrollment] = useState(false);
  const [copied, setCopied] = useState(false);

  const idempotencyKey = useMemo(() => newIdempotencyKey(), []);

  if (!canCreate) {
    return (
      <AxioStateSwitch
        loading={false}
        error={{
          message:
            "You do not have permission to create partners (authority.partner.create). This access attempt has been logged.",
        }}
        empty={false}
      >
        <></>
      </AxioStateSwitch>
    );
  }

  function set<K extends keyof CreatePartnerForm>(key: K, value: CreatePartnerForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => {
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }

  function handleContinue() {
    const parsed = createPartnerFormSchema.safeParse({
      ...form,
      state: form.state.toUpperCase(),
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setForm(parsed.data);
    setPhase("review");
  }

  async function handleSubmit() {
    setPhase("submitting");
    setFailure(null);
    try {
      const response = await partnersApi.create({
        organizationName: form.organizationName,
        partnerType: form.partnerType,
        state: form.state,
        country: form.country,
        isolationMode: form.isolationMode,
        administrativeContact: {
          fullName: form.adminFullName,
          email: form.adminEmail,
          phone: form.adminPhone || undefined,
        },
        idempotencyKey,
      });
      setResult(response);
      setPhase("done");
      toast(
        `Hospital registered: ${response.partner.id}`,
        "success",
        response.correlationId,
      );
    } catch (err) {
      if (err instanceof BackendNotConfiguredError) {
        setFailure({ message: err.message });
      } else if (err instanceof AuthorityApiError) {
        setFailure({ message: err.message, correlationId: err.correlationId });
      } else {
        setFailure({ message: "Hospital creation failed unexpectedly." });
      }
      setPhase("failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AxioBreadcrumb
        items={[
          { label: "Partners", href: "/partners" },
          { label: "Create partner" },
        ]}
      />

      {phase !== "done" && phase !== "failed" && (
        <WorkflowProgress current={phase === "form" ? 0 : 1} />
      )}

      {phase === "form" && (
        <div className="rounded-md border border-slate-200 bg-white p-6 shadow-axio">
          <h2 className="text-base font-semibold text-slate-900">
            Organization details
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AxioInput
              label="Organization name"
              value={form.organizationName}
              onChange={(e) => set("organizationName", e.target.value)}
              error={fieldErrors.organizationName}
              placeholder="e.g. Medanta Hospital"
              className="sm:col-span-2"
            />
            <AxioSelect
              label="Partner type"
              value={form.partnerType}
              onChange={(e) => set("partnerType", e.target.value as CreatePartnerForm["partnerType"])}
              error={fieldErrors.partnerType}
              options={[
                { value: "HOSPITAL", label: "Hospital" },
                { value: "CLINIC", label: "Clinic" },
                { value: "LABORATORY", label: "Laboratory" },
                { value: "INSURER", label: "Insurer" },
                { value: "PHARMACY", label: "Pharmacy" },
                { value: "GOVERNMENT", label: "Government organization" },
              ]}
            />
            <AxioInput
              label="State / UT code"
              value={form.state}
              onChange={(e) => set("state", e.target.value.toUpperCase())}
              error={fieldErrors.state}
              hint="2-letter code, e.g. KL"
              mono
              maxLength={2}
            />
            <AxioInput
              label="Country"
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              error={fieldErrors.country}
            />
            <AxioSelect
              label="Isolation mode"
              value={form.isolationMode}
              onChange={(e) => set("isolationMode", e.target.value as CreatePartnerForm["isolationMode"])}
              error={fieldErrors.isolationMode}
              options={[
                { value: "DEDICATED_DATABASE", label: "Dedicated database" },
                { value: "SHARED", label: "Shared database" },
              ]}
              hint="Requested mode — backend provisions tenant accordingly."
            />
            <AxioInput
              label="Administrative contact — full name"
              value={form.adminFullName}
              onChange={(e) => set("adminFullName", e.target.value)}
              error={fieldErrors.adminFullName}
              className="sm:col-span-2"
            />
            <AxioInput
              label="Administrative contact — email"
              type="email"
              value={form.adminEmail}
              onChange={(e) => set("adminEmail", e.target.value)}
              error={fieldErrors.adminEmail}
            />
            <AxioInput
              label="Administrative contact — phone (optional)"
              type="tel"
              value={form.adminPhone ?? ""}
              onChange={(e) => set("adminPhone", e.target.value)}
              error={fieldErrors.adminPhone}
            />
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
            <AxioButton variant="secondary" onClick={() => router.push("/partners")}>
              Cancel
            </AxioButton>
            <AxioButton onClick={handleContinue}>Review</AxioButton>
          </div>
        </div>
      )}

      <AxioModal
        open={phase === "review"}
        title="Review hospital details"
        onClose={() => setPhase("form")}
        wide
        footer={
          <>
            <AxioButton variant="secondary" onClick={() => setPhase("form")}>
              Back
            </AxioButton>
            <AxioButton onClick={handleSubmit}>Create hospital</AxioButton>
          </>
        }
      >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <ReviewRow label="Organization" value={form.organizationName} />
          <ReviewRow label="Partner type" value={form.partnerType} />
          <ReviewRow label="State / UT" value={form.state} mono />
          <ReviewRow label="Country" value={form.country} />
          <ReviewRow
            label="Isolation mode"
            value={form.isolationMode === "SHARED" ? "Shared database" : "Dedicated database"}
          />
          <ReviewRow label="Admin contact" value={form.adminFullName} />
          <ReviewRow label="Admin email" value={form.adminEmail} />
          <ReviewRow label="Admin phone" value={form.adminPhone || "—"} />
        </dl>
      </AxioModal>

      {phase === "submitting" && (
        <div className="rounded-md border border-slate-200 bg-white p-6 shadow-axio">
          <h2 className="text-base font-semibold text-slate-900">Creating hospital…</h2>
          <div className="mt-6" role="status" aria-label="Provisioning in progress">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" />
              <p className="text-sm text-slate-600">
                Calling live backend proxy. Provisioning tenant and initial administrator…
              </p>
            </div>
          </div>
        </div>
      )}

      {phase === "done" && result && (
        <div className="space-y-4">
          <div className="rounded-md border border-green-300 bg-green-50 px-6 py-5">
            <h2 className="text-base font-semibold text-green-900">
              Hospital Registered Successfully
            </h2>
            <p className="mt-1 text-xs text-green-800">
              The backend has created the organization, tenant, and initial administrator.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-6 shadow-axio space-y-6">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Partner ID</dt>
                <dd className="mt-0.5">
                  <AxioIdDisplay id={result.partner.id} kind="partner" />
                </dd>
              </div>
              <ReviewRow label="Organization" value={result.partner.organizationName} />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Tenant ID</dt>
                <dd className="mt-0.5">
                  <AxioIdDisplay id={result.tenant.id} kind="tenant" />
                </dd>
              </div>
              <ReviewRow label="Tenant status" value={result.tenant.status} />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Operator ID</dt>
                <dd className="mt-0.5">
                  <AxioIdDisplay id={result.initialOperator.id} kind="operator" />
                </dd>
              </div>
              <ReviewRow label="Operator type" value={`${result.initialOperator.type} — Administrator`} />
              <ReviewRow label="Isolation mode" value={result.partner.isolationMode} />
              <ReviewRow label="Administrator email" value={result.initialOperator.email || "—"} />
              <ReviewRow label="Created at (UTC)" value={new Date(result.partner.createdAt).toUTCString()} />
              <ReviewRow label="Created at (Local)" value={new Date(result.partner.createdAt).toLocaleString()} />
              <ReviewRow label="Correlation ID" value={result.correlationId} mono />
            </dl>

            {/* D3 Secure Administrator Enrollment Step */}
            {result.enrollmentUrl && (
              <div className="rounded-md border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                      Single-Use Administrator Enrollment Link
                    </h3>
                    <p className="mt-0.5 text-xs text-amber-800">
                      Deliver this link out-of-band to the new administrator. It is single-use,
                      expires after activation, and will NOT be stored or shown again.
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    Shown Once
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-xs bg-white border border-amber-300 rounded px-3 py-2 text-slate-800 truncate">
                    {revealEnrollment ? result.enrollmentUrl : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                  </div>
                  <AxioButton
                    variant="secondary"
                    onClick={() => setRevealEnrollment((r) => !r)}
                  >
                    {revealEnrollment ? "Mask" : "Reveal"}
                  </AxioButton>
                  <AxioButton
                    onClick={() => {
                      if (result.enrollmentUrl) {
                        navigator.clipboard.writeText(result.enrollmentUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                  >
                    {copied ? "Copied" : "Copy Link"}
                  </AxioButton>
                </div>
              </div>
            )}

            <div className="flex gap-3 border-t border-slate-200 pt-4">
              <AxioButton
                onClick={() => {
                  const targetId = result.partner.id;
                  setResult(null);
                  router.push(`/partners/${encodeURIComponent(targetId)}`);
                }}
              >
                Open partner
              </AxioButton>
              <AxioButton
                variant="secondary"
                onClick={() => {
                  setResult(null);
                  router.push("/partners");
                }}
              >
                Back to partners
              </AxioButton>
            </div>
          </div>
        </div>
      )}

      {phase === "failed" && failure && (
        <AxioErrorState
          title="Hospital registration failed"
          message={`${failure.message} Nothing was activated: if any provisioning step failed, the backend rolled the transaction back.`}
          correlationId={failure.correlationId}
          onRetry={() => setPhase("review")}
        />
      )}
    </div>
  );
}

function WorkflowProgress({ current }: { current: number }) {
  const steps = ["Details", "Review", "Provision"];
  return (
    <ol aria-label="Partner creation progress" className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden="true" className="text-slate-300">→</span>}
          <span
            className={[
              "rounded border px-2 py-1 font-medium",
              i === current
                ? "border-brand-600 bg-brand-50 text-brand-800"
                : i < current
                  ? "border-green-300 bg-green-50 text-green-800"
                  : "border-slate-200 bg-white text-slate-500",
            ].join(" ")}
            aria-current={i === current ? "step" : undefined}
          >
            {i + 1}. {s}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ReviewRow({
  label,
  value,
  mono = false,
  strong = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={`mt-0.5 text-slate-900 ${mono ? "font-mono text-[13px]" : ""} ${strong ? "font-semibold" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
