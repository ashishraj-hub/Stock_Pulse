import { apiRequest } from "./api";

export interface ReorderCenterItem {
  item_id: string;
  sku: string;
  name: string;
  available_quantity: number;
  reorder_point: number;
  suggested_quantity: number;
  lead_time_days: number;
  is_low_stock: boolean;
}

export interface ReorderPurchaseOrderRequest {
  item_id: string;
  supplier_id: string;
  notes?: string;
  expected_date?: string;
  quantity?: number;
}

export interface ReorderPurchaseOrderResponse {
  purchase_order_id: string;
  item_id: string;
  supplier_id: string;
  quantity: number;
  status: string;
}

export async function getReorderCenter(
  organizationId: string,
): Promise<ReorderCenterItem[]> {
  return apiRequest<ReorderCenterItem[]>(
    `/api/v1/organizations/${organizationId}/reorder-center`,
  );
}

export async function createReorderPurchaseOrder(
  organizationId: string,
  payload: ReorderPurchaseOrderRequest,
): Promise<ReorderPurchaseOrderResponse> {
  return apiRequest<ReorderPurchaseOrderResponse>(
    `/api/v1/organizations/${organizationId}/reorder/purchase-order`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function createSmartReorderPurchaseOrder(
  organizationId: string,
  itemId: string,
  payload: ReorderPurchaseOrderRequest,
): Promise<ReorderPurchaseOrderResponse> {
  return apiRequest<ReorderPurchaseOrderResponse>(
    `/api/v1/organizations/${organizationId}/items/${itemId}/smart-reorder/purchase-order`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}