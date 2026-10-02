import { apiRequest } from "./api";

export type PurchaseOrderStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "ordered"
  | "received"
  | "cancelled";

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  item_id: string;
  quantity: number;
  received_quantity: number;
  unit_price: number | string | null;
}

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  supplier_id: string;
  status: PurchaseOrderStatus;
  order_date: string | null;
  expected_date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  items: PurchaseOrderItem[];
}

export async function getPurchaseOrders(
  organizationId: string,
): Promise<PurchaseOrder[]> {
  return apiRequest<PurchaseOrder[]>(
    `/api/v1/organizations/${organizationId}/purchase-orders`,
  );
}

export async function getPurchaseOrder(
  organizationId: string,
  purchaseOrderId: string,
): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(
    `/api/v1/organizations/${organizationId}/purchase-orders/${purchaseOrderId}`,
  );
}

export async function submitPurchaseOrder(
  organizationId: string,
  purchaseOrderId: string,
): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(
    `/api/v1/organizations/${organizationId}/purchase-orders/${purchaseOrderId}/submit`,
    {
      method: "POST",
    },
  );
}

export async function approvePurchaseOrder(
  organizationId: string,
  purchaseOrderId: string,
): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(
    `/api/v1/organizations/${organizationId}/purchase-orders/${purchaseOrderId}/approve`,
    {
      method: "POST",
    },
  );
}

export async function orderPurchaseOrder(
  organizationId: string,
  purchaseOrderId: string,
): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(
    `/api/v1/organizations/${organizationId}/purchase-orders/${purchaseOrderId}/order`,
    {
      method: "POST",
    },
  );
}

export async function cancelPurchaseOrder(
  organizationId: string,
  purchaseOrderId: string,
): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(
    `/api/v1/organizations/${organizationId}/purchase-orders/${purchaseOrderId}/cancel`,
    {
      method: "POST",
    },
  );
}