import React from "react";
import { isValidOperatorId, isValidPartnerId } from "@axio-authority/validation";

export interface AxioIdDisplayProps {
  id: string;
  kind: "partner" | "operator" | "tenant";
  className?: string;
  showBadge?: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isStandardId(id: string, kind: "partner" | "operator" | "tenant"): boolean {
  if (!id) return false;
  if (kind === "partner") {
    return isValidPartnerId(id);
  }
  if (kind === "operator") {
    return isValidOperatorId(id);
  }
  if (kind === "tenant") {
    return UUID_REGEX.test(id) || id.startsWith("TNT-") || id.startsWith("tnt-");
  }
  return true;
}

/**
 * AxioIdDisplay renders backend-issued IDs verbatim (D4).
 * If the ID does not match the AxioVital canonical format, it renders the raw value
 * accompanied by a non-standard format indicator, without rewriting the backend value.
 */
export function AxioIdDisplay({
  id,
  kind,
  className = "",
  showBadge = true,
}: AxioIdDisplayProps) {
  const standard = isStandardId(id, kind);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="font-mono">{id}</span>
      {!standard && showBadge && (
        <span
          className="inline-flex items-center text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-1 py-0.5 rounded border border-amber-200 dark:border-amber-800"
          title="Backend issued non-standard ID format"
        >
          non-standard ID format
        </span>
      )}
    </span>
  );
}
