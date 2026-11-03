"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  OPERATOR_TYPE_LABELS,
  type Operator,
  type OperatorStatus,
} from "@axio-authority/shared-types";
import {
  createOperatorFormSchema,
  type CreateOperatorForm,
} from "@axio-authority/validation";
import { useApi } from "@/lib/use-api";
import { operatorsApi } from "@/lib/api/operators-api";
import { newIdempotencyKey, AuthorityApiError } from "@/lib/api/client";
import { useCan } from "@/lib/auth/permissions";
import { useToast } from "@/components/ui";
import {
  AxioBadge,
  AxioButton,
  AxioInput,
  AxioModal,
  AxioSelect,
  AxioStateSwitch,
  AxioTable,
  type AxioTableColumn,
  type BadgeTone,
} from "@/components/ui";

const statusTone: Record<OperatorStatus, BadgeTone> = {
  PENDING: "warning",
  ACTIVE: "healthy",
  SUSPENDED: "offline",
  REVOKED: "neutral",
};

/** /operators — operator identities across the partner network. */
export default function OperatorsPage() {
  const toast = useToast();
  const canCreate = useCan("authority.operator.create");
  const [status, setStatus] = useState<OperatorStatus | "">("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, loading, error, retry } = useApi(
    () =>
      operatorsApi.list({
        status: status || undefined,
        search: search || undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, search],
  );

  const columns: AxioTableColumn<Operator>[] = useMemo(
    () => [
      {
        key: "id",
        header: "Operator ID",
        className: "font-mono text-xs whitespace-nowrap",
        render: (o) => (
          <Link
            href={`/operators/${encodeURIComponent(o.id)}`}
            className="text-brand-700 hover:text-brand-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded"
          >
            {o.id}
          </Link>
        ),
      },
      {
        key: "name",
        header: "Display name",
        render: (o) => (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">{o.displayName}</span>
              {o.isRealUser && (
                <AxioBadge tone="healthy" className="text-[10px]">
                  MAIN SOFTWARE USER
                </AxioBadge>
              )}
            </div>
            <span className="text-xs text-slate-500">{o.email}</span>
            {o.clientApp && (
              <span className="text-[11px] font-mono text-emerald-700">
                {o.clientApp}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "type",
        header: "Type",
        render: (o) => (
          <AxioBadge tone="info">
            {o.type} — {OPERATOR_TYPE_LABELS[o.type]}
          </AxioBadge>
        ),
      },
      {
        key: "partner",
        header: "Partner ID",
        className: "font-mono text-xs whitespace-nowrap",
        render: (o) => o.partnerId,
      },
      {
        key: "status",
        header: "Status",
        render: (o) => <AxioBadge tone={statusTone[o.status]}>{o.status}</AxioBadge>,
      },
      {
        key: "credential",
        header: "Credential",
        render: (o) => <AxioBadge tone="neutral">{o.credentialState}</AxioBadge>,
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <h3 className="text-sm font-semibold text-emerald-900">
              Main Software (AxioVital Desktop) User Sync Active
            </h3>
            <p className="text-xs text-emerald-700">
              Real operators who logged into the native desktop application (such as <strong>Dr. Sharma</strong> at <strong>AxioVital General Hospital</strong>) are automatically recognized and monitored here.
            </p>
          </div>
        </div>
        <div className="text-xs font-mono bg-white/80 border border-emerald-300 rounded px-2.5 py-1 text-emerald-800">
          Source: Windows DPAPI SecureVault
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {canCreate && (
          <AxioButton onClick={() => setCreateOpen(true)}>Create operator</AxioButton>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <AxioInput
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, email, or operator ID"
          className="w-64"
        />
        <AxioSelect
          label="Status filter"
          value={status}
          onChange={(e) => setStatus(e.target.value as OperatorStatus | "")}
          options={[
            { value: "", label: "All statuses" },
            { value: "PENDING", label: "Pending" },
            { value: "ACTIVE", label: "Active" },
            { value: "SUSPENDED", label: "Suspended" },
            { value: "REVOKED", label: "Revoked" },
          ]}
          className="w-52"
        />
      </div>

      <AxioStateSwitch
        loading={loading}
        error={error}
        empty={!loading && !error && (data?.data.length ?? 0) === 0}
        loadingLabel="Loading operators…"
        onRetry={retry}
        emptyTitle="No operators found"
        emptyDescription="No operators match the current filter."
      >
        {data && (
          <AxioTable caption="AxioVital operators" columns={columns} rows={data.data} />
        )}
      </AxioStateSwitch>

      <CreateOperatorModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(op) => {
          setCreateOpen(false);
          toast(`Operator ${op.id} created.`, "success");
          retry();
        }}
      />
    </div>
  );
}

function CreateOperatorModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (op: Operator) => void;
}) {
  const [form, setForm] = useState<CreateOperatorForm>({
    partnerId: "",
    displayName: "",
    type: "S",
    email: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();

  function set<K extends keyof CreateOperatorForm>(key: K, value: CreateOperatorForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => {
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  }

  async function handleSubmit() {
    const parsed = createOperatorFormSchema.safeParse(form);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const op = await operatorsApi.create({
        ...parsed.data,
        idempotencyKey: newIdempotencyKey(),
      });
      onCreated(op);
    } catch (err) {
      setSubmitError(
        err instanceof AuthorityApiError ? err.message : "Operator creation failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AxioModal
      open={open}
      title="Create operator"
      onClose={onClose}
      footer={
        <>
          <AxioButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </AxioButton>
          <AxioButton onClick={handleSubmit} loading={submitting}>
            Create operator
          </AxioButton>
        </>
      }
    >
      <div className="space-y-4">
        <AxioInput
          label="Partner ID"
          value={form.partnerId}
          onChange={(e) => set("partnerId", e.target.value.toUpperCase())}
          error={fieldErrors.partnerId}
          hint="Format AXP-{STATE}-{SUFFIX}, e.g. AXP-KL-7K42F8"
          mono
        />
        <AxioInput
          label="Display name"
          value={form.displayName}
          onChange={(e) => set("displayName", e.target.value)}
          error={fieldErrors.displayName}
        />
        <AxioSelect
          label="Operator type"
          value={form.type}
          onChange={(e) => set("type", e.target.value as CreateOperatorForm["type"])}
          error={fieldErrors.type}
          options={(
            Object.entries(OPERATOR_TYPE_LABELS) as Array<[string, string]>
          ).map(([value, label]) => ({ value, label: `${value} — ${label}` }))}
        />
        <AxioInput
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          error={fieldErrors.email}
        />
        {submitError && (
          <p role="alert" className="text-sm font-medium text-red-700">
            {submitError}
          </p>
        )}
      </div>
    </AxioModal>
  );
}
