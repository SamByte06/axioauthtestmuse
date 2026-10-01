import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "healthy"
  | "warning"
  | "degraded"
  | "offline"
  | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "text-slate-600",
  healthy: "text-green-700",
  warning: "text-amber-700",
  degraded: "text-orange-700",
  offline: "text-red-700",
  info: "text-blue-700",
};

/** AxioBadge — compact, color-coded text label without a pill or background. */
export function AxioBadge({
  tone = "neutral",
  children,
  mono = false,
  className = "",
}: {
  tone?: BadgeTone;
  children: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span
      className={[
        "text-xs font-medium whitespace-nowrap",
        mono ? "font-mono" : "",
        tones[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
