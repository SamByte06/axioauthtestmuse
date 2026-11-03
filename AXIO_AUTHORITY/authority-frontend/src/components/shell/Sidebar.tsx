"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuthorityPermission } from "@axio-authority/shared-types";
import { useAuth } from "@/lib/auth/session";
import { AxioGlobe } from "@/components/shell/AxioGlobe";

interface NavItem {
  label: string;
  href: string;
  permission: AuthorityPermission;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", permission: "authority.dashboard.read" },
  { label: "Partners", href: "/partners", permission: "authority.partner.read" },
  { label: "Tenants", href: "/tenants", permission: "authority.tenant.read" },
  { label: "Operators", href: "/operators", permission: "authority.operator.read" },
  { label: "Credentials", href: "/credentials", permission: "authority.credentials.read" },
  { label: "Security", href: "/security", permission: "authority.security.read" },
  { label: "Audit", href: "/audit", permission: "authority.audit.read" },
  { label: "Integrations", href: "/integrations", permission: "authority.integration.read" },
  { label: "Settings", href: "/settings", permission: "authority.dashboard.read" },
];

/**
 * Authority primary navigation — displayed in the upper navbar.
 * Items are filtered by the backend-issued session permissions.
 * Hiding is a usability mirror only; the backend enforces authorization.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { state, logout } = useAuth();
  const session = state.status === "authenticated" ? state.session : null;

  return (
    <header className="shrink-0 bg-authority-900 text-authority-100">
      <div className="flex min-h-16 items-center gap-5 border-b border-authority-800 px-5">
        <AxioGlobe className="h-8 w-8 text-authority-300" />
        <div className="shrink-0">
          <p className="text-sm font-semibold leading-tight text-white">
            AXIOVITAL
          </p>
          <p className="text-[11px] uppercase tracking-widest text-authority-300">
            Authority
          </p>
        </div>

        <nav
          aria-label="Authority navigation"
          className="min-w-0 flex-1 overflow-x-auto"
        >
          <ul className="flex w-max min-w-full items-center gap-1 py-2">
            {NAV_ITEMS.filter((item) =>
              // Permission-gated visibility (mirror only)
              session?.permissions.includes(item.permission),
            ).map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                      active
                        ? "bg-authority-800 text-white"
                        : "text-authority-200 hover:bg-authority-800/60 hover:text-white",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-4 text-xs">
          <button
            type="button"
            onClick={() => void logout()}
            className="whitespace-nowrap rounded font-medium text-authority-200 hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
