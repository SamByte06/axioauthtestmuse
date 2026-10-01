/** dashboard-api.ts — typed client for the network dashboard. */
import { AuthorityContracts } from "@axio-authority/api-contracts";
import type { DashboardSummary } from "@axio-authority/api-contracts";
import { apiFetch } from "./client";

export const dashboardApi = {
  summary() {
    return apiFetch<DashboardSummary>(AuthorityContracts.dashboard.path);
  },
};
