/**
 * @axio-authority/ui — AxioVital design tokens
 *
 * The shared visual baseline for the AxioVital product family.
 *
 * NOTE ON PROVENANCE: no AxioVital Native frontend codebase was available in
 * this workspace to inspect, so these tokens ESTABLISH the AxioVital visual
 * baseline rather than extract it. They are deliberately conservative —
 * enterprise healthcare-infrastructure console, not consumer SaaS:
 * restrained radius, dense readable type, professional tables, explicit
 * status language. When the Native codebase becomes available, converge it
 * onto these tokens (see docs/architecture/design-system.md).
 */

export const axioColors = {
  // Authority chrome — AxioVital petrol blue, sampled from the AxioVital
  // Provider Operating Environment login screen (2026-09-30):
  // background #04608c, heading steel-blue #85b2c7.
  authority: {
    50: "#f0f7fb",
    100: "#dcedf5",
    200: "#bcdaea",
    300: "#85b2c7",
    400: "#4f97b8",
    500: "#247da3",
    600: "#0c6690",
    700: "#04608c",
    800: "#045a82",
    900: "#043e5a",
    950: "#032c41",
  },
  // Brand action color — AxioVital blue (primary buttons, links, focus).
  brand: {
    50: "#eef7fc",
    100: "#d9edf8",
    200: "#b4dcf1",
    300: "#85b2c7",
    400: "#4f97b8",
    500: "#1d7ca6",
    600: "#0a6a95",
    700: "#04608c",
    800: "#045a82",
    900: "#053e5a",
    950: "#032b40",
  },
  // Status language — shared across Authority and Native
  status: {
    healthy: { fg: "#166534", bg: "#dcfce7", border: "#86efac" },
    warning: { fg: "#92400e", bg: "#fef3c7", border: "#fcd34d" },
    degraded: { fg: "#9a3412", bg: "#ffedd5", border: "#fdba74" },
    offline: { fg: "#991b1b", bg: "#fee2e2", border: "#fca5a5" },
    unknown: { fg: "#475569", bg: "#f1f5f9", border: "#cbd5e1" },
    info: { fg: "#1e40af", bg: "#dbeafe", border: "#93c5fd" },
  },
} as const;

export const axioRadius = {
  xs: "3px",
  sm: "4px",
  md: "6px",
  lg: "8px",
  // Deliberately no pill/xl radius: this is an infrastructure console.
} as const;

export const axioFont = {
  sans: [
    "Inter",
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    '"Segoe UI"',
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
  ],
  mono: [
    "ui-monospace",
    '"SF Mono"',
    "SFMono-Regular",
    "Menlo",
    "Consolas",
    '"Liberation Mono"',
    "monospace",
  ],
} as const;

/** Spacing scale follows Tailwind defaults; Authority uses dense 4px base. */
export const axioSpacing = { base: 4 } as const;

/** Map a backend HealthState to a status token key. */
export function healthStateToStatus(
  state: "HEALTHY" | "WARNING" | "DEGRADED" | "OFFLINE" | "UNKNOWN",
): keyof typeof axioColors.status {
  switch (state) {
    case "HEALTHY":
      return "healthy";
    case "WARNING":
      return "warning";
    case "DEGRADED":
      return "degraded";
    case "OFFLINE":
      return "offline";
    default:
      return "unknown";
  }
}
