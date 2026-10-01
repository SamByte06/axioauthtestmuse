/** tenants-api.ts — typed client for the Tenants domain. */
import { AuthorityContracts, type SuspendRequest } from "@axio-authority/api-contracts";
import type {
  PaginatedResponse,
  Tenant,
  TenantLifecycle,
} from "@axio-authority/shared-types";
import { apiFetch, newIdempotencyKey } from "./client";

export interface TenantFilters {
  lifecycle?: TenantLifecycle;
  page?: number;
  pageSize?: number;
  search?: string;
}

export const tenantsApi = {
  list(filters: TenantFilters = {}) {
    return apiFetch<PaginatedResponse<Tenant>>(AuthorityContracts.listTenants.path, {
      query: {
        lifecycle: filters.lifecycle,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 25,
        search: filters.search,
      },
    });
  },

  get(tenantId: string) {
    return apiFetch<Tenant>(AuthorityContracts.getTenant.buildPath({ tenantId }));
  },

  /** Start (or retry) backend provisioning. The backend performs the work. */
  provision(tenantId: string) {
    return apiFetch<Tenant>(
      AuthorityContracts.provisionTenant.buildPath({ tenantId }),
      { method: "POST", body: { idempotencyKey: newIdempotencyKey() } },
    );
  },

  suspend(tenantId: string, request: SuspendRequest) {
    return apiFetch<Tenant>(
      AuthorityContracts.suspendTenant.buildPath({ tenantId }),
      { method: "POST", body: request },
    );
  },
};
