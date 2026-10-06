import { apiRequest } from "./api";

export interface ReorderSuggestion {
  item_id: string;
  sku: string;
  name: string;
  available_quantity: number;
  reorder_point: number;
  suggested_quantity: number;
  lead_time_days: number;
  is_low_stock: boolean;
}

export async function getReorderSuggestion(
  organizationId: string,
  itemId: string,
): Promise<ReorderSuggestion> {
  return apiRequest<ReorderSuggestion>(
    `/api/v1/organizations/${organizationId}/items/${itemId}/reorder-suggestion`,
  );
}