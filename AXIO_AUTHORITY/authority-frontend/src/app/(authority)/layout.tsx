"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/session";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { AxioLoadingState, AxioErrorState } from "@/components/ui";

const TITLES: Array<[RegExp, string]> = [
  [/^\/dashboard$/, "Network Dashboard"],
  [/^\/partners\/new$/, "Create Partner"],
  [/^\/partners\/[^/]+$/, "Partner Detail"],
  [/^\/partners$/, "Partners"],
  [/^\/tenants\/[^/]+$/, "Tenant Detail"],
  [/^\/tenants$/, "Tenants"],
  [/^\/operators\/[^/]+$/, "Operator Detail"],
  [/^\/operators$/, "Operators"],
  [/^\/credentials$/, "Credentials"],
  [/^\/security$/, "Security"],
  [/^\/audit$/, "Audit Log"],
  [/^\/integrations$/, "Integrations"],
  [/^\/settings$/, "Settings"],
];

function titleFor(pathname: string): string {
  for (const [re, title] of TITLES) {
    if (re.test(pathname)) return title;
  }
  return "AxioVital Authority";
}

/**
 * Authority shell layout + auth guard.
 * - No session → /login. No demo bypass, ever.
 * - Backend unconfigured → explicit notice, not a fake dashboard.
 */
export default function AuthorityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useAuth();

  useEffect(() => {
    if (state.status === "unauthenticated") router.replace("/login");
  }, [state.status, router]);

  if (state.status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md">
          <AxioLoadingState label="Establishing Authority session…" />
        </div>
      </main>
    );
  }

  if (state.status === "unconfigured") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-lg">
          <AxioErrorState
            title="Backend connection not configured"
            message="This Authority console is not connected to an AxioVital backend. Set NEXT_PUBLIC_AUTHORITY_API_BASE_URL and reload. No data is shown until a real backend is connected."
          />
        </div>
      </main>
    );
  }

  if (state.status !== "authenticated") return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      <Sidebar />
      <Topbar title={titleFor(pathname)} />
      <main className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
