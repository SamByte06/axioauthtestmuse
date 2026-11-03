/** tenants-api.ts — typed client for the Tenants domain. */
import { AuthorityContracts, type SuspendRequest } from "@axio-authority/api-contracts";
import type {
  PaginatedResponse,
  Tenant,
  TenantLifecycle,
} from "@axio-authority/shared-types";
import { apiFetch, isDemoMode, newIdempotencyKey } from "./client";
import { mapTenantDtoToConsoleTenant } from "./backend/mappers";
import type { TenantDto } from "./backend/dto";

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

  async get(tenantId: string): Promise<Tenant> {
    if (isDemoMode()) {
      return apiFetch<Tenant>(AuthorityContracts.getTenant.buildPath({ tenantId }));
    }
    const dto = await apiFetch<TenantDto>(`/tenants/${encodeURIComponent(tenantId)}`);
    return mapTenantDtoToConsoleTenant(dto);
  },

  /** Start (or retry) backend provisioning. The backend performs the work. */
  provision(tenantId: string) {
    return apiFetch<Tenant>(
      AuthorityContracts.provisionTenant.buildPath({ tenantId }),
      { method: "POST", body: { idempotencyKey: newIdempotencyKey() } },
    );
  },

  async suspend(tenantId: string, request: SuspendRequest): Promise<Tenant> {
    if (isDemoMode()) {
      return apiFetch<Tenant>(
        AuthorityContracts.suspendTenant.buildPath({ tenantId }),
        { method: "POST", body: request },
      );
    }
    await apiFetch(`/tenants/${encodeURIComponent(tenantId)}/disable`, {
      method: "POST",
      body: request,
    });
    return this.get(tenantId);
  },
};
