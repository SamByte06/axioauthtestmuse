import { healthStateToStatus } from "@axio-authority/ui";
import type { HealthState } from "@axio-authority/shared-types";
import type { BadgeTone } from "./AxioBadge";

const textColors: Record<BadgeTone, string> = {
  neutral: "text-slate-600",
  healthy: "text-green-700",
  warning: "text-amber-700",
  degraded: "text-orange-700",
  offline: "text-red-700",
  info: "text-blue-700",
};

const labels: Record<HealthState, string> = {
  HEALTHY: "Healthy",
  WARNING: "Warning",
  DEGRADED: "Degraded",
  OFFLINE: "Offline",
  UNKNOWN: "Unknown",
};

/**
 * AxioStatus — color-coded status text.
 * The single place where infrastructure health is rendered.
 */
export function AxioStatus({
  state,
  label,
  className = "",
}: {
  state: HealthState;
  label?: string;
  className?: string;
}) {
  const mapped = healthStateToStatus(state);
  const tone: BadgeTone = mapped === "unknown" ? "neutral" : mapped;
  return (
    <span className={`text-xs font-medium ${textColors[tone]} ${className}`}>
      {label ?? labels[state]}
    </span>
  );
}
