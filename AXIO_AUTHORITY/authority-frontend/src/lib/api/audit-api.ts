/** audit-api.ts — typed client for the Audit domain (append-only log). */
import { AuthorityContracts } from "@axio-authority/api-contracts";
import type {
  AuditAction,
  AuditEvent,
  AuditResult,
  IsoTimestamp,
  PaginatedResponse,
  PartnerId,
} from "@axio-authority/shared-types";
import { apiFetch } from "./client";

export interface AuditFilters {
  actor?: string;
  action?: AuditAction;
  partnerId?: PartnerId;
  result?: AuditResult;
  from?: IsoTimestamp;
  to?: IsoTimestamp;
  page?: number;
  pageSize?: number;
}

export const auditApi = {
  list(filters: AuditFilters = {}) {
    return apiFetch<PaginatedResponse<AuditEvent>>(
      AuthorityContracts.listAuditEvents.path,
      {
        query: {
          actor: filters.actor,
          action: filters.action,
          partnerId: filters.partnerId,
          result: filters.result,
          from: filters.from,
          to: filters.to,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? 50,
        },
      },
    );
  },
};
