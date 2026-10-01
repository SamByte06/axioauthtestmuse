import type { ReactNode } from "react";
import { AxioButton } from "./AxioButton";

/** AxioEmptyState — shown when a list legitimately has no records. */
export function AxioEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-md border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div aria-hidden="true" className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-500">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="3" width="14" height="14" rx="2" />
          <path d="M7 8h6M7 12h4" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-600">{description}</p>}
      {actionLabel && onAction && (
        <AxioButton variant="secondary" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </AxioButton>
      )}
    </div>
  );
}

/** AxioLoadingState — skeleton-ish loading block with an accessible label. */
export function AxioLoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="rounded-md border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" />
        <p className="text-sm text-slate-600">{label}</p>
      </div>
      <div aria-hidden="true" className="mt-4 space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-slate-100" style={{ width: `${88 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

/** AxioErrorState — administrator-facing error. Shows the message + correlation ID, never a stack trace. */
export function AxioErrorState({
  title = "Something went wrong",
  message,
  correlationId,
  onRetry,
}: {
  title?: string;
  message: string;
  correlationId?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-6 py-8 text-center">
      <h3 className="text-sm font-semibold text-red-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-red-800">{message}</p>
      {correlationId && (
        <p className="mt-2 font-mono text-xs text-red-700">
          Correlation ID: {correlationId}
        </p>
      )}
      {onRetry && (
        <AxioButton variant="secondary" size="sm" onClick={onRetry} className="mt-4">
          Retry
        </AxioButton>
      )}
    </div>
  );
}

/** Small helper to render one of loading / error / empty / content. */
export function AxioStateSwitch({
  loading,
  error,
  empty,
  loadingLabel,
  errorTitle,
  errorMessage,
  errorCorrelationId,
  onRetry,
  emptyTitle,
  emptyDescription,
  children,
}: {
  loading: boolean;
  error: { message: string; correlationId?: string } | null;
  empty: boolean;
  loadingLabel?: string;
  errorTitle?: string;
  errorMessage?: string;
  errorCorrelationId?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  children: ReactNode;
}) {
  if (loading) return <AxioLoadingState label={loadingLabel} />;
  if (error)
    return (
      <AxioErrorState
        title={errorTitle}
        message={errorMessage ?? error.message}
        correlationId={errorCorrelationId ?? error.correlationId}
        onRetry={onRetry}
      />
    );
  if (empty)
    return <AxioEmptyState title={emptyTitle ?? "No records"} description={emptyDescription} />;
  return <>{children}</>;
}
