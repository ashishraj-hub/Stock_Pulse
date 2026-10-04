import { apiRequest } from "./api";

export interface SmartReorderResponse {
  item_id: string;
  sku: string;
  name: string;

  available_quantity: number;
  reorder_point: number;
  lead_time_days: number;
  safety_stock_days: number;

  average_daily_usage: number;
  predicted_daily_usage: number;

  lead_time_demand: number;
  safety_stock: number;
  target_stock: number;

  recommended_quantity: number;

  forecast_method: string;
  forecast_confidence: string;

  is_low_stock: boolean;
}

export interface SmartReorderParams {
  historyDays?: number;
  forecastDays?: number;
  safetyStockDays?: number;
}

export async function getSmartReorderRecommendation(
  organizationId: string,
  itemId: string,
  params: SmartReorderParams = {},
): Promise<SmartReorderResponse> {
  const historyDays = params.historyDays ?? 30;
  const forecastDays = params.forecastDays ?? 7;
  const safetyStockDays = params.safetyStockDays ?? 3;

  const query = new URLSearchParams({
    history_days: String(historyDays),
    forecast_days: String(forecastDays),
    safety_stock_days: String(safetyStockDays),
  });

  return apiRequest<SmartReorderResponse>(
    `/api/v1/organizations/${organizationId}/items/${itemId}/smart-reorder?${query.toString()}`,
  );
}