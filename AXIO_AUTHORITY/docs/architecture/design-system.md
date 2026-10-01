# AxioVital Design System (Authority baseline)

## Provenance — read this first

The build brief required reusing the AxioVital Native visual identity
(typography, spacing, radius, cards, buttons, inputs, tables, dialogs,
sidebar, status indicators, themes). **No AxioVital Native frontend codebase
was available in the build workspace**, so the first baseline was established
fresh in `packages/ui` (documented below as v1).

**Update 2026-09-30 (v2 theme):** the user provided the actual AxioVital
**Provider Operating Environment** login screen. Colors were sampled directly
from that screenshot and the `authority`/`brand` ramps were converged onto
them — the Authority console now uses the real AxioVital petrol-blue
(`#04608c`) and steel-blue (`#85b2c7`) family instead of the invented v1
navy/teal. The login screen mirrors the Operating Environment layout (globe +
wordmark, white labels over white inputs on the teal surface, light action
button, legal footer).

## Design philosophy

Enterprise healthcare-infrastructure console. Not a SaaS marketing dashboard.

Avoid: generic analytics SaaS appearance, excessive gradients, oversized
radii, cartoon icons, gratuitous animation, huge marketing headings,
consumer dashboards, fake "AI" widgets, meaningless charts.

Prefer: strong hierarchy, dense but readable information, professional
tables, clear status indicators, security-oriented visual language, precise
terminology, predictable navigation, explicit confirmation flows.

## Tokens (`packages/ui`)

| Token | Value | Rationale |
|---|---|---|
| `authority` (AxioVital petrol blue) | `#032C41`–`#F0F7FB`, core `#04608C` | Control-plane chrome: sidebar, login backdrop. Sampled from the Provider Operating Environment. |
| `brand` (AxioVital blue) | `#032B40`–`#EEF7FC`, primary `#04608C` | Primary actions, links, focus rings. Same AxioVital blue. |
| `status.*` | healthy/warning/degraded/offline/unknown/info | Single status language shared with Native. Dots + labels, never color alone. |
| `radius` | 3–8px | Restrained. No pill radii — this is an operations console. |
| `font.sans` | Inter → system stack | Dense UI text. |
| `font.mono` | system mono, tabular-nums | Identifiers (`AXP-…`, `AXO-…`, correlation IDs, timestamps). |

Light theme is default (clinical workstations); `darkMode: "class"` is
wired for a future dark theme using the same tokens.

## Component set (`Axio*`)

`AxioButton, AxioInput, AxioSelect, AxioTable, AxioModal, AxioDrawer,
AxioBadge, AxioStatus, AxioBreadcrumb, AxioToast, AxioConfirmDialog,
AxioEmptyState, AxioErrorState, AxioLoadingState, AxioMetricCard,
AxioTimeline, AxioAuditTable`

Rules:

- One primitive per concern — no duplicated styling across pages.
- Every page composes loading / error / empty / unauthorized states from
  `AxioStates`; blank screens are a defect.
- Destructive actions go through `AxioConfirmDialog`: consequence text +
  identifier re-type + audit reason.
- Status is rendered only via `AxioStatus`/`AxioBadge` with text labels —
  color is never the only signal (accessibility).
- Focus is always visible (`:focus-visible` ring, brand-600).

## Authority differentiation (same language, different purpose)

Native speaks in *patient / appointment / clinical / hospital operation*.
Authority speaks in *partner / tenant / operator / security / provisioning /
network / audit*. Same tokens, same components — different vocabulary and
information density. An operator moving between the two should feel they
never left the AxioVital environment.
