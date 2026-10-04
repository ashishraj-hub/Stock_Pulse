import { apiRequest } from "./api";

export interface Item {
  id: string;
  organization_id: string;
  sku: string;
  name: string;
  barcode: string | null;
  unit: string;
  reorder_point: number;
  reorder_quantity: number;
  lead_time_days: number;
  created_at: string;
}

export interface CreateItemRequest {
  sku: string;
  name: string;
  barcode?: string | null;
  unit: string;
  reorder_point?: number;
  reorder_quantity?: number;
  lead_time_days?: number;
}

export async function getItems(
  organizationId: string,
): Promise<Item[]> {
  return apiRequest<Item[]>(
    `/api/v1/organizations/${organizationId}/items`,
  );
}

export async function getItem(
  organizationId: string,
  itemId: string,
): Promise<Item> {
  return apiRequest<Item>(
    `/api/v1/organizations/${organizationId}/items/${itemId}`,
  );
}

export async function getItemByBarcode(
  organizationId: string,
  barcode: string,
): Promise<Item> {
  return apiRequest<Item>(
    `/api/v1/organizations/${organizationId}/items/barcode/${encodeURIComponent(barcode)}`,
  );
}

export async function createItem(
  organizationId: string,
  data: CreateItemRequest,
): Promise<Item> {
  return apiRequest<Item>(
    `/api/v1/organizations/${organizationId}/items`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}