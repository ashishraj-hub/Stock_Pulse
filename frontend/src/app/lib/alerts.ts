import { apiRequest } from "./api";

export type AlertType =
  | "out_of_stock"
  | "low_stock"
  | "expired"
  | "expiring_soon"
  | "expiring";

export type AlertSeverity =
  | "critical"
  | "warning"
  | "notice";

export interface InventoryAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;

  item_id: string;
  sku: string;
  item_name: string;

  available_quantity: number;
  reorder_point: number;

  batch_id: string | null;
  lot_number: string | null;

  location_id: string | null;
  location_name: string | null;

  expiry_date: string | null;
  days_until_expiry: number | null;
}

export async function getInventoryAlerts(
  organizationId: string,
): Promise<InventoryAlert[]> {
  return apiRequest<InventoryAlert[]>(
    `/api/v1/organizations/${organizationId}/alerts`,
  );
}