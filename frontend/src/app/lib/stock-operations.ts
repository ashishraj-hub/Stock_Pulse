import { apiRequest } from "./api";

export interface StockMovementResponse {
  id: string;
  item_id: string;
  batch_id: string | null;
  location_id: string;
  performed_by: string | null;
  movement_type: string;
  quantity: number;
  reason: string | null;
  created_at: string;
}

export interface ReceiveStockRequest {
  quantity: number;
  reason?: string;
}

export interface IssueStockRequest {
  quantity: number;
  reason?: string;
}

export interface WastageStockRequest {
  quantity: number;
  reason: string;
}

export interface TransferStockRequest {
  quantity: number;
  destination_location_id: string;
  reason?: string;
}

export interface FefoIssueRequest {
  quantity: number;
  reason?: string;
}

export async function receiveStock(
  organizationId: string,
  itemId: string,
  batchId: string,
  locationId: string,
  data: ReceiveStockRequest,
): Promise<StockMovementResponse> {
  return apiRequest<StockMovementResponse>(
    `/api/v1/organizations/${organizationId}/items/${itemId}/batches/${batchId}/locations/${locationId}/receive`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function issueStock(
  organizationId: string,
  itemId: string,
  batchId: string,
  locationId: string,
  data: IssueStockRequest,
): Promise<StockMovementResponse> {
  return apiRequest<StockMovementResponse>(
    `/api/v1/organizations/${organizationId}/items/${itemId}/batches/${batchId}/locations/${locationId}/issue`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function recordWastage(
  organizationId: string,
  itemId: string,
  batchId: string,
  locationId: string,
  data: WastageStockRequest,
): Promise<StockMovementResponse> {
  return apiRequest<StockMovementResponse>(
    `/api/v1/organizations/${organizationId}/items/${itemId}/batches/${batchId}/locations/${locationId}/wastage`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function transferStock(
  organizationId: string,
  itemId: string,
  batchId: string,
  locationId: string,
  data: TransferStockRequest,
): Promise<StockMovementResponse[]> {
  return apiRequest<StockMovementResponse[]>(
    `/api/v1/organizations/${organizationId}/items/${itemId}/batches/${batchId}/locations/${locationId}/transfer`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function fefoIssueStock(
  organizationId: string,
  itemId: string,
  locationId: string,
  data: FefoIssueRequest,
): Promise<StockMovementResponse[]> {
  return apiRequest<StockMovementResponse[]>(
    `/api/v1/organizations/${organizationId}/items/${itemId}/locations/${locationId}/fefo-issue`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}