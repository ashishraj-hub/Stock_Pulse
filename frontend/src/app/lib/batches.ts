import { apiRequest } from "./api";

export interface Batch {
  id: string;
  item_id: string;
  lot_number: string;
  expiry_date: string | null;
  received_at: string;
  is_archived: boolean;
}

export interface CreateBatchRequest {
  lot_number: string;
  expiry_date?: string | null;
}

export interface BatchArchiveResponse {
  id: string;
  lot_number: string;
  is_archived: boolean;
}

export async function getBatches(
  organizationId: string,
  itemId: string,
): Promise<Batch[]> {
  return apiRequest<Batch[]>(
    `/api/v1/organizations/${organizationId}/items/${itemId}/batches`,
  );
}

export async function getBatch(
  organizationId: string,
  itemId: string,
  batchId: string,
): Promise<Batch> {
  return apiRequest<Batch>(
    `/api/v1/organizations/${organizationId}/items/${itemId}/batches/${batchId}`,
  );
}

export async function createBatch(
  organizationId: string,
  itemId: string,
  data: CreateBatchRequest,
): Promise<Batch> {
  return apiRequest<Batch>(
    `/api/v1/organizations/${organizationId}/items/${itemId}/batches`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function archiveBatch(
  organizationId: string,
  itemId: string,
  batchId: string,
): Promise<BatchArchiveResponse> {
  return apiRequest<BatchArchiveResponse>(
    `/api/v1/organizations/${organizationId}/items/${itemId}/batches/${batchId}/archive`,
    {
      method: "POST",
    },
  );
}