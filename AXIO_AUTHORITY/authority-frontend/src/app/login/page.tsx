"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { loginFormSchema } from "@axio-authority/validation";
import { useAuth } from "@/lib/auth/session";
import { isBackendConfigured, isDemoMode } from "@/lib/api/client";
import { AuthorityApiError, BackendNotConfiguredError } from "@/lib/api/client";
import { AxioButton, AxioInput, AxioErrorState } from "@/components/ui";
import { AxioGlobe } from "@/components/shell/AxioGlobe";

/**
 * Authority sign-in.
 * Visual language follows the AxioVital Provider Operating Environment:
 * AxioVital petrol-blue surface, globe + wordmark, white labels over white
 * inputs, light action button.
 *
 * Authenticates against the AxioVital BACKEND only. There is no local,
 * hardcoded, or demo credential path — if the backend is not reachable,
 * sign-in is impossible and the page says so.
 * Exception: explicit opt-in demo mode (NEXT_PUBLIC_AUTHORITY_DEMO_MODE=true)
 * serves the in-memory fixture backend; the sign-in page displays an inline
 * demo notice and any valid-form credentials sign in as the demo administrator.
 */
export default function LoginPage() {
  const router = useRouter();
  const { state, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [correlationId, setCorrelationId] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  if (state.status === "authenticated") {
    router.replace("/dashboard");
    return null;
  }

  if (!isBackendConfigured()) {
    return (
      <>
        <main className="flex min-h-screen flex-col bg-authority-700">
          <AuthorityWordmark />
          <div className="flex flex-1 items-center justify-center px-6 py-10">
            <div className="w-full max-w-md">
              <AxioErrorState
                title="Backend connection not configured"
                message="This Authority console is not connected to an AxioVital backend. Sign-in is disabled until NEXT_PUBLIC_AUTHORITY_API_BASE_URL is set. No offline or demo sign-in is available by design."
              />
            </div>
          </div>
          <AuthorityLegal />
        </main>
      </>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    setCorrelationId(undefined);

    const parsed = loginFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check the form and try again.");
      return;
    }

    setSubmitting(true);
    try {
      await login(parsed.data);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof BackendNotConfiguredError) {
        setFormError(err.message);
      } else if (err instanceof AuthorityApiError) {
        setFormError(err.message);
        setCorrelationId(err.correlationId);
      } else {
        setFormError("Sign-in failed. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <main className="flex min-h-screen flex-col bg-authority-700">
        <AuthorityWordmark />
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            <h1 className="text-center text-3xl font-semibold tracking-tight text-authority-300">
              AxioVital Authority&trade;
            </h1>
            <p className="mt-2 text-center text-sm text-white">
              Restricted to authorized AxioVital Authority personnel.
            </p>
            {isDemoMode() && (
              <p
                role="note"
                className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900"
              >
                Demo mode is on: any email and password signs you in as the demo
                administrator. All data is test fixtures.
              </p>
            )}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <AxioInput
                label="Work email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                tone="dark"
              />
              <AxioInput
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                tone="dark"
              />
              {formError && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-800">{formError}</p>
                  {correlationId && (
                    <p className="mt-1 font-mono text-xs text-red-700">
                      Correlation ID: {correlationId}
                    </p>
                  )}
                </div>
              )}
              <AxioButton
                type="submit"
                variant="secondary"
                loading={submitting}
                className="w-full"
              >
                Sign in
              </AxioButton>
            </form>
            <p className="mt-6 text-xs leading-relaxed text-authority-200">
              Authority sessions are issued by the AxioVital backend and are
              separate from hospital operator sessions. A hospital administrator
              account does not grant Authority access. Failed sign-in attempts are
              logged.
            </p>
          </div>
        </div>
        <AuthorityLegal />
      </main>
    </>
  );
}

/** Top-left identity: globe + wordmark, as in the Operating Environment. */
function AuthorityWordmark() {
  return (
    <div className="flex items-center gap-2 px-6 pt-5 text-white">
      <AxioGlobe className="h-7 w-7 text-authority-200" />
      <span className="text-lg font-semibold tracking-tight">AxioVital</span>
    </div>
  );
}

/** Bottom legal line, as in the Operating Environment. */
function AuthorityLegal() {
  return (
    <p className="px-6 pb-5 text-[11px] leading-relaxed text-authority-300">
      &copy; 2026 AxioVital Corporation. All rights reserved. Unauthorized use of
      this system may result in civil damages and criminal penalties.
    </p>
  );
}
