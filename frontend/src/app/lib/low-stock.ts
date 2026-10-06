import { apiRequest } from "./api";

export interface LowStockItem {
  item_id: string;
  sku: string;
  name: string;
  available_quantity: number;
  reorder_point: number;
  reorder_quantity: number;
  lead_time_days: number;
  shortage_quantity: number;
}

export async function getLowStockItems(
  organizationId: string,
): Promise<LowStockItem[]> {
  return apiRequest<LowStockItem[]>(
    `/api/v1/organizations/${organizationId}/dashboard/low-stock`,
  );
}