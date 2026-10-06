import { apiRequest } from "./api";

export interface ScannedItem {
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

export async function getItemByBarcode(
  organizationId: string,
  barcode: string,
): Promise<ScannedItem> {
  return apiRequest<ScannedItem>(
    `/api/v1/organizations/${organizationId}/items/barcode/${encodeURIComponent(barcode)}`,
  );
}