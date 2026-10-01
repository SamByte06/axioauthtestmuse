/**
 * Auth boundary for AxioVital Authority.
 *
 * - Authentication is performed EXCLUSIVELY by the AxioVital backend.
 * - No hardcoded credentials, no fake login, no frontend-only auth.
 * - Session tokens live in httpOnly cookies set by the backend; the browser
 *   JavaScript never sees them (XSS cannot steal what JS cannot read).
 * - Authority authentication is a distinct authorization context from
 *   hospital operator authentication: a hospital admin is NOT automatically
 *   an Authority admin. The backend issues Authority sessions only to
 *   Authority identities.
 */
"use client";

import { AuthorityContracts } from "@axio-authority/api-contracts";
import type {
  AuthoritySession,
  LoginRequest,
} from "@axio-authority/api-contracts";
import {
  apiFetch,
  BackendNotConfiguredError,
  isBackendConfigured,
} from "../api/client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SessionState =
  | { status: "loading" }
  | { status: "unconfigured" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; session: AuthoritySession };

interface AuthContextValue {
  state: SessionState;
  login: (request: LoginRequest) => Promise<AuthoritySession>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  const refresh = useCallback(async () => {
    if (!isBackendConfigured()) {
      setState({ status: "unconfigured" });
      return;
    }
    try {
      const session = await apiFetch<AuthoritySession>(
        AuthorityContracts.session.path,
      );
      setState({ status: "authenticated", session });
    } catch (error) {
      if (error instanceof BackendNotConfiguredError) {
        setState({ status: "unconfigured" });
      } else {
        // 401 (or unreachable backend) → treat as unauthenticated; the UI
        // surfaces the backend state honestly on the login page.
        setState({ status: "unauthenticated" });
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (request: LoginRequest) => {
    const { session } = await apiFetch<{ session: AuthoritySession }>(
      AuthorityContracts.login.path,
      { method: "POST", body: request },
    );
    setState({ status: "authenticated", session });
    return session;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch(AuthorityContracts.logout.path, { method: "POST" });
    } finally {
      setState({ status: "unauthenticated" });
    }
  }, []);

  const value = useMemo(
    () => ({ state, login, logout, refresh }),
    [state, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export function useSession(): AuthoritySession | null {
  const { state } = useAuth();
  return state.status === "authenticated" ? state.session : null;
}
