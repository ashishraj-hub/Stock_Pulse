import { apiRequest } from "./api";
import type { PurchaseOrderStatus } from "./purchase-orders";

export interface PurchaseOrderReceiveItem {
  purchase_order_item_id: string;
  location_id: string;
  quantity: number;
  lot_number: string;
  expiry_date?: string | null;
}

export interface PurchaseOrderReceiveRequest {
  items: PurchaseOrderReceiveItem[];
}

export interface PurchaseOrderReceiveResponse {
  id: string;
  organization_id: string;
  supplier_id: string;
  status: PurchaseOrderStatus;
  order_date: string | null;
  expected_date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  items: Array<{
    id: string;
    purchase_order_id: string;
    item_id: string;
    quantity: number;
    received_quantity: number;
    unit_price: number | string | null;
  }>;
}

export async function receivePurchaseOrder(
  organizationId: string,
  purchaseOrderId: string,
  payload: PurchaseOrderReceiveRequest,
): Promise<PurchaseOrderReceiveResponse> {
  return apiRequest<PurchaseOrderReceiveResponse>(
    `/api/v1/organizations/${organizationId}/purchase-orders/${purchaseOrderId}/receive`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}