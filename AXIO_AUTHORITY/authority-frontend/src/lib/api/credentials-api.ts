/** credentials-api.ts — typed client for the Credentials domain.
 * Displays credential STATE only. Secret values never reach the browser. */
import { AuthorityContracts, type SuspendRequest } from "@axio-authority/api-contracts";
import type {
  CreateEnrollmentRequest,
  Credential,
  CredentialState,
  EnrollmentResponse,
  OperatorId,
  PaginatedResponse
} from "@axio-authority/shared-types";
import { apiFetch } from "./client";

export interface CredentialFilters {
  state?: CredentialState;
  operatorId?: OperatorId;
  page?: number;
  pageSize?: number;
}

export const credentialsApi = {
  list(filters: CredentialFilters = {}) {
    return apiFetch<PaginatedResponse<Credential>>(
      AuthorityContracts.listCredentials.path,
      {
        query: {
          state: filters.state,
          operatorId: filters.operatorId,
          page: filters.page ?? 1,
          pageSize: filters.pageSize ?? 25,
        },
      },
    );
  },

  /** Create a secure enrollment workflow. Never returns permanent secrets. */
  createEnrollment(operatorId: OperatorId, request: CreateEnrollmentRequest) {
    return apiFetch<EnrollmentResponse>(
      AuthorityContracts.createEnrollment.buildPath({ operatorId }),
      { method: "POST", body: request },
    );
  },

  revoke(credentialId: string, request: SuspendRequest) {
    return apiFetch<Credential>(
      AuthorityContracts.revokeCredential.buildPath({ credentialId }),
      { method: "POST", body: request },
    );
  },
};
