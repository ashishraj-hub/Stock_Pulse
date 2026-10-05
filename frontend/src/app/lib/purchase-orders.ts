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

export interface PurchaseOrderItemCreate {
  item_id: string;
  quantity: number;
  unit_price?: number | null;
}

export interface CreatePurchaseOrderRequest {
  supplier_id: string;
  expected_date?: string | null;
  notes?: string | null;
  items: PurchaseOrderItemCreate[];
}

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

export async function createPurchaseOrder(
  organizationId: string,
  data: CreatePurchaseOrderRequest,
): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(
    `/api/v1/organizations/${organizationId}/purchase-orders`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
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

export async function receivePurchaseOrder(
  organizationId: string,
  purchaseOrderId: string,
  data: PurchaseOrderReceiveRequest,
): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(
    `/api/v1/organizations/${organizationId}/purchase-orders/${purchaseOrderId}/receive`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}