/** partners-api.ts — typed client for the Partners domain. */
import { AuthorityContracts, type SuspendRequest } from "@axio-authority/api-contracts";
import type {
  CreatePartnerRequest,
  CreatePartnerResponse,
  PaginatedResponse,
  Partner,
  PartnerId,
  PartnerStatus
} from "@axio-authority/shared-types";
import { apiFetch } from "./client";

export interface PartnerFilters {
  status?: PartnerStatus;
  page?: number;
  pageSize?: number;
  search?: string;
}

export const partnersApi = {
  list(filters: PartnerFilters = {}) {
    return apiFetch<PaginatedResponse<Partner>>(AuthorityContracts.listPartners.path, {
      query: {
        status: filters.status,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 25,
        search: filters.search,
      },
    });
  },

  get(partnerId: PartnerId) {
    return apiFetch<Partner>(
      AuthorityContracts.getPartner.buildPath({ partnerId }),
    );
  },

  /** Full transactional create: partner → tenant → operator → provision → audit. Backend-authoritative. */
  create(request: CreatePartnerRequest) {
    return apiFetch<CreatePartnerResponse>(AuthorityContracts.createPartner.path, {
      method: "POST",
      body: request,
    });
  },

  activate(partnerId: PartnerId) {
    return apiFetch<Partner>(
      AuthorityContracts.activatePartner.buildPath({ partnerId }),
      { method: "POST" },
    );
  },

  suspend(partnerId: PartnerId, request: SuspendRequest) {
    return apiFetch<Partner>(
      AuthorityContracts.suspendPartner.buildPath({ partnerId }),
      { method: "POST", body: request },
    );
  },
};
