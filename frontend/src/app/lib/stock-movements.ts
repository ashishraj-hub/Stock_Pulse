import { apiRequest } from "./api";

export type MovementType =
  | "receive"
  | "issue"
  | "adjustment"
  | "wastage"
  | "transfer";

export interface StockMovement {
  id: string;

  item_id: string;
  sku: string;
  item_name: string;

  batch_id: string | null;
  lot_number: string | null;

  location_id: string;
  location_name: string;

  performed_by: string | null;
  performed_by_name: string | null;

  movement_type: MovementType;
  quantity: number;
  reason: string | null;

  created_at: string;
}

export async function getStockMovements(
  organizationId: string,
): Promise<StockMovement[]> {
  return apiRequest<StockMovement[]>(
    `/api/v1/organizations/${organizationId}/stock-movements`,
  );
}