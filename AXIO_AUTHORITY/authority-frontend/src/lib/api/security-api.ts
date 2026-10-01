/** security-api.ts — typed client for the Security domain. */
import { AuthorityContracts } from "@axio-authority/api-contracts";
import type { SecuritySummary } from "@axio-authority/shared-types";
import { apiFetch } from "./client";

export const securityApi = {
  summary() {
    return apiFetch<SecuritySummary>(AuthorityContracts.securitySummary.path);
  },
};
