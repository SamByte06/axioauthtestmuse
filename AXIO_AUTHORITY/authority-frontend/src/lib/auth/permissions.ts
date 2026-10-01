/**
 * RBAC helpers for the Authority frontend.
 *
 * Frontend visibility MIRRORS backend permissions but is NEVER the security
 * boundary: the backend enforces every permission on every request.
 * These helpers only decide what to show/hide to keep the UI honest about
 * what the current administrator may attempt.
 */
"use client";

import type {
  AuthorityPermission,
  AuthoritySession,
} from "@axio-authority/shared-types";
import { useSession } from "./session";

/** Pure check — easily unit-tested. */
export function hasPermission(
  session: AuthoritySession | null,
  permission: AuthorityPermission,
): boolean {
  if (!session) return false;
  return session.permissions.includes(permission);
}

/** Pure check for "any of". */
export function hasAnyPermission(
  session: AuthoritySession | null,
  permissions: AuthorityPermission[],
): boolean {
  if (!session) return false;
  return permissions.some((p) => session.permissions.includes(p));
}

/** React hook version, driven by the backend-issued session. */
export function useCan(permission: AuthorityPermission): boolean {
  return hasPermission(useSession(), permission);
}

export function useCanAny(permissions: AuthorityPermission[]): boolean {
  return hasAnyPermission(useSession(), permissions);
}
