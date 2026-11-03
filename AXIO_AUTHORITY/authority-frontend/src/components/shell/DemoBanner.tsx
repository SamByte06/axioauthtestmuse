"use client";

import { isDemoMode } from "@/lib/api/client";

/**
 * Persistent amber DEMO banner.
 * Displayed across all pages when opt-in demo mode is active in development.
 * Never displayed in production.
 */
export function DemoBanner() {
  if (!isDemoMode()) return null;

  return (
    <div
      role="status"
      aria-label="Demo mode indicator"
      className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-300 bg-amber-100 px-4 py-1.5 text-xs font-medium text-amber-950 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        <span>
          <strong>DEMO MODE ACTIVE:</strong> In-memory test fixtures only. No real backend connected. State resets on reload.
        </span>
      </div>
      <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-amber-800 font-semibold">
        Non-production fixture environment
      </span>
    </div>
  );
}
