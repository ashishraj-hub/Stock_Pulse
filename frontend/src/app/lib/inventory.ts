import { apiRequest } from "./api";

export interface InventoryListItem {
  inventory_lot_id: string;
  item_id: string;
  sku: string;
  item_name: string;

  batch_id: string;
  lot_number: string;
  expiry_date: string | null;

  location_id: string;
  location_name: string;

  quantity_on_hand: number;
  reserved_quantity: number;
  available_quantity: number;

  updated_at: string;
}

export async function getInventory(
  organizationId: string,
): Promise<InventoryListItem[]> {
  return apiRequest<InventoryListItem[]>(
    `/api/v1/organizations/${organizationId}/inventory`,
  );
}