/** operators-api.ts — typed client for the Operators domain. */

import { AuthorityContracts, type SuspendRequest } from "@axio-authority/api-contracts";

import type {

  CreateOperatorRequest,

  EnrollmentResponse,

  Operator,

  OperatorId,

  OperatorStatus,

  PaginatedResponse,

  PartnerId,

  ReactivateOperatorRequest,

  ResetRecoveryRequest,

  RevokeSessionsRequest,

  SessionRevocationSummary,

  UpdateOperatorRoleRequest,

} from "@axio-authority/shared-types";

import { apiFetch, isDemoMode, newIdempotencyKey } from "./client";

import { mapUserAdminDtoToOperator } from "./backend/mappers";

import type { EnrollmentInvitationDto, UserAdminDto } from "./backend/dto";



export interface OperatorFilters {

  partnerId?: PartnerId;

  status?: OperatorStatus;

  page?: number;

  pageSize?: number;

  search?: string;

}



export const operatorsApi = {

  list(filters: OperatorFilters = {}) {

    return apiFetch<PaginatedResponse<Operator>>(

      AuthorityContracts.listOperators.path,

      {

        query: {

          partnerId: filters.partnerId,

          status: filters.status,

          page: filters.page ?? 1,

          pageSize: filters.pageSize ?? 25,

          search: filters.search,

        },

      },

    );

  },



  get(operatorId: OperatorId) {

    return apiFetch<Operator>(

      AuthorityContracts.getOperator.buildPath({ operatorId }),

    );

  },



  /** Backend generates the Operator ID. The frontend never invents one. */

  create(request: CreateOperatorRequest) {

    return apiFetch<Operator>(AuthorityContracts.createOperator.path, {

      method: "POST",

      body: request,

    });

  },



  async suspend(operatorId: OperatorId, request: SuspendRequest): Promise<Operator> {

    if (isDemoMode()) {

      return apiFetch<Operator>(

        AuthorityContracts.suspendOperator.buildPath({ operatorId }),

        { method: "POST", body: request },

      );

    }

    await apiFetch(`/users/${encodeURIComponent(operatorId)}/disable`, {

      method: "POST",

      body: request,

    });

    return this.get(operatorId);

  },



  async getRoles(operatorId: OperatorId): Promise<string[]> {

    if (isDemoMode()) {

      const op = await this.get(operatorId);

      return [op.type];

    }

    return apiFetch<string[]>(`/users/${encodeURIComponent(operatorId)}/roles`);

  },



  async assignRole(operatorId: OperatorId, roleId: string): Promise<void> {

    if (isDemoMode()) {

      return;

    }

    await apiFetch(`/users/${encodeURIComponent(operatorId)}/roles`, {

      method: "POST",

      body: { roleId },

    });

  },



  async removeRole(operatorId: OperatorId, roleId: string): Promise<void> {

    if (isDemoMode()) {

      return;

    }

    await apiFetch(`/users/${encodeURIComponent(operatorId)}/roles/${encodeURIComponent(roleId)}`, {

      method: "DELETE",

    });

  },



  async invite(request: { tenantId: string; email: string; initialRoleName?: string }): Promise<EnrollmentInvitationDto> {

    if (isDemoMode()) {

      return {

        invitationId: "00000000-0000-0000-0000-000000000000",

        tenantId: request.tenantId,

        email: request.email,

        expiresAtUtc: new Date(Date.now() + 86400000).toISOString(),

      };

    }

    return apiFetch<EnrollmentInvitationDto>(`/users/invite`, {

      method: "POST",

      body: request,

    });

  },



  async createAdmin(request: {

    tenantId: string;

    email: string;

    username?: string;

    firstName?: string;

    lastName?: string;

    password?: string;

    requireMfa?: boolean;

    partnerId?: string;

  }): Promise<Operator> {

    if (isDemoMode()) {

      return this.create({
        partnerId: (request.partnerId || "AXP-KL-7K42F8") as any,
        displayName: `${request.firstName ?? ""} ${request.lastName ?? ""}`.trim() || request.email,
        email: request.email,
        type: "A",
        idempotencyKey: newIdempotencyKey(),
      });

    }

    const dto = await apiFetch<UserAdminDto>(`/users/create-admin`, {

      method: "POST",

      body: {

        tenantId: request.tenantId,

        email: request.email,

        username: request.username,

        firstName: request.firstName,

        lastName: request.lastName,

        password: request.password,

        requireMfa: request.requireMfa ?? true,

      },

    });

    return mapUserAdminDtoToOperator(dto, request.partnerId);

  },



  reactivate(operatorId: OperatorId, request: ReactivateOperatorRequest) {

    return apiFetch<Operator>(

      AuthorityContracts.reactivateOperator.buildPath({ operatorId }),

      { method: "POST", body: request },

    );

  },



  updateRole(operatorId: OperatorId, request: UpdateOperatorRoleRequest) {

    return apiFetch<Operator>(

      AuthorityContracts.updateOperatorRole.buildPath({ operatorId }),

      { method: "PATCH", body: request },

    );

  },



  revoke(operatorId: OperatorId, request: SuspendRequest) {

    return apiFetch<Operator>(

      AuthorityContracts.revokeOperator.buildPath({ operatorId }),

      { method: "POST", body: request },

    );

  },



  resetCredential(operatorId: OperatorId, request: ResetRecoveryRequest) {

    return apiFetch<EnrollmentResponse>(

      AuthorityContracts.resetOperatorCredential.buildPath({ operatorId }),

      { method: "POST", body: request },

    );

  },



  revokeSessions(operatorId: OperatorId, request: RevokeSessionsRequest) {

    return apiFetch<SessionRevocationSummary>(

      AuthorityContracts.revokeOperatorSessions.buildPath({ operatorId }),

      { method: "POST", body: request },

    );

  },

};

