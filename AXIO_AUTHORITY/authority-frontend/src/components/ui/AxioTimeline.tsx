import type { ReactNode } from "react";

export interface TimelineItem {
  id: string;
  title: string;
  timestamp?: string;
  description?: ReactNode;
  tone?: "neutral" | "healthy" | "warning" | "degraded" | "offline" | "info";
}

const toneDot: Record<NonNullable<TimelineItem["tone"]>, string> = {
  neutral: "bg-slate-400",
  healthy: "bg-green-600",
  warning: "bg-amber-500",
  degraded: "bg-orange-500",
  offline: "bg-red-600",
  info: "bg-blue-600",
};

/** AxioTimeline — vertical event timeline (provisioning steps, lifecycle history). */
export function AxioTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-0">
      {items.map((item) => (
        <li key={item.id} className="relative pl-6">
          <span
            aria-hidden="true"
            className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${toneDot[item.tone ?? "neutral"]}`}
          />
          <p className="text-sm font-medium text-slate-900">{item.title}</p>
          {item.timestamp && (
            <p className="text-xs tabular-nums text-slate-500">{item.timestamp}</p>
          )}
          {item.description && (
            <div className="mt-1 text-sm text-slate-600">{item.description}</div>
          )}
        </li>
      ))}
    </ol>
  );
}
