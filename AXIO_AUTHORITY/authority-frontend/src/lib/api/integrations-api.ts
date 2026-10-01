/** integrations-api.ts — typed client for the Integrations domain. */
import { AuthorityContracts } from "@axio-authority/api-contracts";
import type { Integration } from "@axio-authority/shared-types";
import { apiFetch } from "./client";

export const integrationsApi = {
  list() {
    return apiFetch<Integration[]>(AuthorityContracts.listIntegrations.path);
  },
};
