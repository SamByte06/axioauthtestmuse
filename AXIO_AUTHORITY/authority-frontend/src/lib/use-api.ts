"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AuthorityApiError,
  BackendNotConfiguredError,
} from "./api/client";

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: { message: string; correlationId?: string } | null;
  retry: () => void;
}

/**
 * useApi — fetch backend state with honest loading/error semantics.
 * - backend unconfigured → "Backend connection not configured" (never fake data)
 * - API errors → administrator-facing message + correlation ID
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiState<T>["error"]>(null);
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const depKey = JSON.stringify(deps);

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoading(false);
        if (err instanceof BackendNotConfiguredError) {
          setError({
            message:
              "Backend connection not configured. Set NEXT_PUBLIC_AUTHORITY_API_BASE_URL to connect this console to the AxioVital backend.",
          });
        } else if (err instanceof AuthorityApiError) {
          setError({ message: err.message, correlationId: err.correlationId });
        } else {
          setError({ message: "An unexpected error occurred." });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, depKey]);

  return { data, loading, error, retry };
}
