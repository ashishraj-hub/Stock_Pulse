import { apiRequest } from "./api";

export interface DashboardSummary {
  total_items: number;
  total_available_units: number;
  low_stock_count: number;
  out_of_stock_count: number;
  pending_reorder_count: number;
}

export async function getDashboardSummary(
  organizationId: string,
): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>(
    `/api/v1/organizations/${organizationId}/dashboard/summary`,
  );
}