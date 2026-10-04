import { apiRequest } from "./api";

export interface ProcurementSummary {
  total: number;
  draft: number;
  pending_approval: number;
  approved: number;
  ordered: number;
  received: number;
  cancelled: number;
}

export async function getProcurementSummary(
  organizationId: string,
): Promise<ProcurementSummary> {
  return apiRequest<ProcurementSummary>(
    `/api/v1/organizations/${organizationId}/dashboard/procurement-summary`,
  );
}