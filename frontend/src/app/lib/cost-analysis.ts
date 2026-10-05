import { apiRequest } from "./api";

export interface CostTrendPoint {
  date: string;
  procurement_spend: string;
  wastage_cost: string;
}

export interface CostItemBreakdown {
  item_id: string;
  sku: string;
  item_name: string;
  quantity: number;
  unit_cost: string;
  estimated_cost: string;
}

export interface CostAnalysisResponse {
  period_start: string;
  period_end: string;

  procurement_spend: string;
  estimated_wastage_cost: string;
  estimated_inventory_value: string;

  received_units: number;
  wasted_units: number;
  available_units: number;

  top_wastage_items: CostItemBreakdown[];
  inventory_by_item: CostItemBreakdown[];
  trend: CostTrendPoint[];
}

export async function getCostAnalysis(
  organizationId: string,
  historyDays = 30,
): Promise<CostAnalysisResponse> {
  return apiRequest<CostAnalysisResponse>(
    `/api/v1/organizations/${organizationId}/cost-analysis/summary?history_days=${historyDays}`,
  );
}