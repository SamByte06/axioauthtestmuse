/** partners-api.ts — typed client for the Partners domain. */
import { AuthorityContracts, type SuspendRequest } from "@axio-authority/api-contracts";
import type {
  CreatePartnerRequest,
  CreatePartnerResponse,
  PaginatedResponse,
  Partner,
  PartnerId,
  PartnerStatus,
  RevokeSessionsRequest,
  SessionRevocationSummary,
} from "@axio-authority/shared-types";
import { apiFetch, isDemoMode } from "./client";
import {
  mapCreatePartnerFormToBackend,
  mapBackendHospitalResponseToCreatePartnerResponse,
} from "./backend/mappers";
import {
  sanitizeHospitalResponse,
  type CreateHospitalResponseRawDto,
} from "./backend/dto";

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
  async create(request: CreatePartnerRequest): Promise<CreatePartnerResponse> {
    if (isDemoMode()) {
      return apiFetch<CreatePartnerResponse>(AuthorityContracts.createPartner.path, {
        method: "POST",
        body: request,
      });
    }

    const endpoint = request.partnerType === "HOSPITAL" ? "/hospitals" : "/organizations/b2b";
    const payload = mapCreatePartnerFormToBackend({
      organizationName: request.organizationName,
      partnerType: request.partnerType,
      state: request.state,
      country: request.country,
      isolationMode: request.isolationMode,
      adminFullName: request.administrativeContact.fullName,
      adminEmail: request.administrativeContact.email,
    });

    const raw = await apiFetch<CreateHospitalResponseRawDto>(endpoint, {
      method: "POST",
      body: payload,
      headers: request.idempotencyKey ? { "Idempotency-Key": request.idempotencyKey } : undefined,
    });

    const sanitized = sanitizeHospitalResponse(raw);
    const correlationId = (raw as Record<string, unknown>).correlationId as string || "AX-REQ-BACKEND";
    return mapBackendHospitalResponseToCreatePartnerResponse(sanitized, correlationId);
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

  revokeSessions(partnerId: PartnerId, request: RevokeSessionsRequest) {
    return apiFetch<SessionRevocationSummary>(
      AuthorityContracts.revokePartnerSessions.buildPath({ partnerId }),
      { method: "POST", body: request },
    );
  },
};
