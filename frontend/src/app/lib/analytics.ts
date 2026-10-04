import { apiRequest } from "./api";

export interface AnalyticsItemUsage {
  item_id: string;
  sku: string;
  name: string;
  quantity: number;
}

export interface AnalyticsDailyUsage {
  date: string;
  quantity: number;
}

export interface AnalyticsMovementSummary {
  receive: number;
  issue: number;
  wastage: number;
  transfer: number;
}

export interface AnalyticsExpiringItem {
  item_id: string;
  sku: string;
  name: string;
  lot_number: string;
  expiry_date: string;
  quantity: number;
  days_until_expiry: number;
}

export interface AnalyticsSummary {
  total_items: number;
  total_available_units: number;
  low_stock_count: number;
  out_of_stock_count: number;

  total_received_units: number;
  total_issued_units: number;
  total_wastage_units: number;
  total_transfer_units: number;

  average_daily_usage: number;
  predicted_daily_usage: number;

  forecast_reorder_count: number;
  forecast_reorder_units: number;

  movement_summary: AnalyticsMovementSummary;

  top_consumed_items: AnalyticsItemUsage[];
  daily_usage: AnalyticsDailyUsage[];
  expiring_items: AnalyticsExpiringItem[];
}

export interface AnalyticsParams {
  historyDays?: number;
  expiringDays?: number;
}

export async function getAnalyticsSummary(
  organizationId: string,
  params: AnalyticsParams = {},
): Promise<AnalyticsSummary> {
  const historyDays = params.historyDays ?? 30;
  const expiringDays = params.expiringDays ?? 30;

  const query = new URLSearchParams({
    history_days: String(historyDays),
    expiring_days: String(expiringDays),
  });

  return apiRequest<AnalyticsSummary>(
    `/api/v1/organizations/${organizationId}/analytics/summary?${query.toString()}`,
  );
}