/**
 * authority-api.ts — typed base client for the AxioVital Authority backend.
 *
 * RULES (see docs/architecture/control-plane-vs-data-plane.md and
 * docs/security/boundaries.md):
 *  - The browser talks ONLY to the Authority backend over HTTPS.
 *  - It NEVER connects directly to PostgreSQL, Redis, or infrastructure.
 *  - If the backend is not configured, every call fails loudly with
 *    BackendNotConfiguredError — the UI renders "Backend connection not
 *    configured" instead of fabricated data. No fake success, ever.
 *  - The single exception is explicit opt-in DEMO mode
 *    (NEXT_PUBLIC_AUTHORITY_DEMO_MODE=true), which routes to the in-memory
 *    fixture backend and banners every page as demo. Never on by default.
 *  - Every request carries an X-Correlation-Id so a multi-step operation
 *    (partner creation, provisioning) can be traced end to end.
 */

import { AUTHORITY_API_PREFIX } from "@axio-authority/api-contracts";
import type { ApiErrorBody, CorrelationId } from "@axio-authority/shared-types";

export class BackendNotConfiguredError extends Error {
  constructor() {
    super(
      "Backend connection not configured. Set NEXT_PUBLIC_AUTHORITY_API_BASE_URL.",
    );
    this.name = "BackendNotConfiguredError";
  }
}

export class AuthorityApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly correlationId?: CorrelationId;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(status: number, body: ApiErrorBody | null, fallbackMessage: string) {
    super(body?.message ?? fallbackMessage);
    this.name = "AuthorityApiError";
    this.status = status;
    this.code = body?.code ?? `HTTP_${status}`;
    this.correlationId = body?.correlationId;
    this.fieldErrors = body?.details;
  }
}

/** Administrator-facing message per HTTP status. No stack traces, no secrets. */
export function administratorMessageFor(status: number, correlationId?: string): string {
  const suffix = correlationId
    ? ` Correlation ID: ${correlationId}. Contact platform operations if the issue persists.`
    : " Contact platform operations if the issue persists.";
  switch (status) {
    case 400:
      return "The request was invalid. Review the highlighted fields and try again.";
    case 401:
      return "Your Authority session has expired. Sign in again.";
    case 403:
      return "You do not have permission for this action. It has been logged." + suffix;
    case 404:
      return "The requested resource was not found. It may have been removed.";
    case 409:
      return "This conflicts with the current state of the resource (it may already exist or be mid-provisioning).";
    case 422:
      return "The backend rejected this request. Review the highlighted fields.";
    case 429:
      return "Too many requests. Wait a moment and try again.";
    case 500:
      return "The platform encountered an internal error." + suffix;
    case 502:
    case 503:
      return "The Authority backend is unavailable." + suffix;
    default:
      return "An unexpected error occurred." + suffix;
  }
}

export function getApiBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_AUTHORITY_API_BASE_URL?.trim();
  return url && url.length > 0 ? url.replace(/\/$/, "") : null;
}

export function isBackendConfigured(): boolean {
  if (isDemoMode()) return true;
  return getApiBaseUrl() !== null;
}

/**
 * Demo mode: an explicitly opt-in local fixture backend.
 * Enabled ONLY via NEXT_PUBLIC_AUTHORITY_DEMO_MODE=true. Never on by
 * default. While active, apiFetch is served by the in-memory demo backend
 * (demo-backend.ts) instead of a real backend. State resets on reload;
 * nothing is real.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_AUTHORITY_DEMO_MODE === "true";
}

function newCorrelationId(): CorrelationId {
  // crypto.randomUUID is available in all supported browsers.
  return `AX-REQ-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  // Demo mode short-circuits to the in-memory fixture backend. The dynamic
  // import keeps demo code out of the production bundle and avoids any
  // import cycle with demo-backend.ts.
  if (isDemoMode()) {
    const { demoApiFetch } = await import("./demo-backend");
    return demoApiFetch<T>(path, options);
  }

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new BackendNotConfiguredError();

  const correlationId = newCorrelationId();
  const query = options.query
    ? "?" +
      new URLSearchParams(
        Object.fromEntries(
          Object.entries(options.query)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        ),
      ).toString()
    : "";

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${AUTHORITY_API_PREFIX}${path}${query}`, {
      ...options,
      credentials: "include", // httpOnly session cookie, set by the backend
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Correlation-Id": correlationId,
        ...(options.headers ?? {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new AuthorityApiError(
      503,
      { code: "BACKEND_UNREACHABLE", message: administratorMessageFor(503, correlationId), correlationId },
      administratorMessageFor(503, correlationId),
    );
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const body = (payload as ApiErrorBody | null) ?? null;
    const withCorrelation: ApiErrorBody = {
      code: body?.code ?? `HTTP_${response.status}`,
      message: body?.message ?? administratorMessageFor(response.status, body?.correlationId ?? correlationId),
      correlationId: body?.correlationId ?? correlationId,
      details: body?.details,
    };
    throw new AuthorityApiError(response.status, withCorrelation, withCorrelation.message);
  }

  return payload as T;
}

/** Generate an idempotency key for a single wizard / form session. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
