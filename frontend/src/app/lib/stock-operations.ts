"use client";

import { apiRequest } from "./api";
import {
  addOfflineOperation,
  type OfflineOperationType,
} from "./offline-queue";

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

export type StockOperationResult<T> =
  | {
      status: "synced";
      data: T;
    }
  | {
      status: "queued";
      queue_id: string;
    };

function isNetworkError(
  error: unknown,
): boolean {
  return (
    error instanceof TypeError ||
    (typeof navigator !== "undefined" &&
      !navigator.onLine)
  );
}

async function executeOrQueue<T>(
  operation: OfflineOperationType,
  path: string,
  body: unknown,
): Promise<StockOperationResult<T>> {
  /*
   * If the browser already knows it is offline,
   * immediately place the operation in IndexedDB.
   */
  if (
    typeof window !== "undefined" &&
    !navigator.onLine
  ) {
    const queueId =
      await addOfflineOperation(
        operation,
        path,
        body,
      );

    return {
      status: "queued",
      queue_id: queueId,
    };
  }

  try {
    const result =
      await apiRequest<T>(
        path,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );

    return {
      status: "synced",
      data: result,
    };
  } catch (error) {
    /*
     * Only network failures are converted
     * into offline queue operations.
     *
     * HTTP errors such as 400, 401, 403,
     * 409 and 500 are still real errors.
     */
    if (!isNetworkError(error)) {
      throw error;
    }

    const queueId =
      await addOfflineOperation(
        operation,
        path,
        body,
      );

    return {
      status: "queued",
      queue_id: queueId,
    };
  }
}

/*
 * IMPORTANT:
 *
 * Receiving is NOT part of the offline stock
 * operation queue.
 *
 * Receiving stock happens through Purchase
 * Order receiving, so this remains a direct
 * online API request.
 */
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
): Promise<
  StockOperationResult<StockMovementResponse>
> {
  return executeOrQueue(
    "issue",
    `/api/v1/organizations/${organizationId}/items/${itemId}/batches/${batchId}/locations/${locationId}/issue`,
    data,
  );
}

export async function recordWastage(
  organizationId: string,
  itemId: string,
  batchId: string,
  locationId: string,
  data: WastageStockRequest,
): Promise<
  StockOperationResult<StockMovementResponse>
> {
  return executeOrQueue(
    "wastage",
    `/api/v1/organizations/${organizationId}/items/${itemId}/batches/${batchId}/locations/${locationId}/wastage`,
    data,
  );
}

export async function transferStock(
  organizationId: string,
  itemId: string,
  batchId: string,
  locationId: string,
  data: TransferStockRequest,
): Promise<
  StockOperationResult<StockMovementResponse[]>
> {
  return executeOrQueue(
    "transfer",
    `/api/v1/organizations/${organizationId}/items/${itemId}/batches/${batchId}/locations/${locationId}/transfer`,
    data,
  );
}

export async function fefoIssueStock(
  organizationId: string,
  itemId: string,
  locationId: string,
  data: FefoIssueRequest,
): Promise<
  StockOperationResult<StockMovementResponse[]>
> {
  return executeOrQueue(
    "fefo",
    `/api/v1/organizations/${organizationId}/items/${itemId}/locations/${locationId}/fefo-issue`,
    data,
  );
}