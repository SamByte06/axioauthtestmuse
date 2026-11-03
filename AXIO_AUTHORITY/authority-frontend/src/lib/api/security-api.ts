/** security-api.ts — typed client for the Security domain. */
import { AuthorityContracts } from "@axio-authority/api-contracts";
import type { SecuritySummary } from "@axio-authority/shared-types";
import { apiFetch } from "./client";

import { isDemoMode } from "./client";
import type { SecurityEventDto } from "./backend/dto";

export const securityApi = {
  summary() {
    return apiFetch<SecuritySummary>(AuthorityContracts.securitySummary.path);
  },

  listSecurityEvents(): Promise<SecurityEventDto[]> {
    if (isDemoMode()) {
      return Promise.resolve([]);
    }
    return apiFetch<SecurityEventDto[]>("/security-events");
  },
};
