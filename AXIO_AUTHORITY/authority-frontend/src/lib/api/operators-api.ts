/** operators-api.ts — typed client for the Operators domain. */
import { AuthorityContracts, type SuspendRequest } from "@axio-authority/api-contracts";
import type {
  CreateOperatorRequest,
  Operator,
  OperatorId,
  OperatorStatus,
  PaginatedResponse,
  PartnerId
} from "@axio-authority/shared-types";
import { apiFetch } from "./client";

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

  suspend(operatorId: OperatorId, request: SuspendRequest) {
    return apiFetch<Operator>(
      AuthorityContracts.suspendOperator.buildPath({ operatorId }),
      { method: "POST", body: request },
    );
  },

  revoke(operatorId: OperatorId, request: SuspendRequest) {
    return apiFetch<Operator>(
      AuthorityContracts.revokeOperator.buildPath({ operatorId }),
      { method: "POST", body: request },
    );
  },
};
