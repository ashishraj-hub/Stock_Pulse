"use client";

import { apiRequest } from "./api";

const DB_NAME = "stockpulse-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-operations";

export type OfflineOperationType =
  | "issue"
  | "wastage"
  | "transfer"
  | "fefo";

export interface OfflineQueueItem {
  id: string;
  operation: OfflineOperationType;
  path: string;
  body: unknown;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(
        new Error(
          "Offline queue is only available in the browser.",
        ),
      );
      return;
    }

    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION,
    );

    request.onerror = () => {
      reject(
        request.error ??
          new Error(
            "Failed to open offline queue database.",
          ),
      );
    };

    request.onupgradeneeded = () => {
      const database = request.result;

      if (
        !database.objectStoreNames.contains(
          STORE_NAME,
        )
      ) {
        const store =
          database.createObjectStore(
            STORE_NAME,
            {
              keyPath: "id",
            },
          );

        store.createIndex(
          "created_at",
          "created_at",
          {
            unique: false,
          },
        );
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function createQueueId(): string {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function notifyQueueChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new Event("stockpulse-queue-changed"),
  );
}

export async function addOfflineOperation(
  operation: OfflineOperationType,
  path: string,
  body: unknown,
): Promise<string> {
  const database = await openDatabase();

  const id = createQueueId();

  const queueItem: OfflineQueueItem = {
    id,
    operation,
    path,
    body,
    created_at: new Date().toISOString(),
    attempts: 0,
    last_error: null,
  };

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        database.transaction(
          STORE_NAME,
          "readwrite",
        );

      const store =
        transaction.objectStore(
          STORE_NAME,
        );

      store.add(queueItem);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ??
            new Error(
              "Failed to queue offline operation.",
            ),
        );
      };
    },
  );

  database.close();

  notifyQueueChanged();

  return id;
}

export async function getOfflineQueue(): Promise<
  OfflineQueueItem[]
> {
  const database = await openDatabase();

  const items = await new Promise<
    OfflineQueueItem[]
  >((resolve, reject) => {
    const transaction =
      database.transaction(
        STORE_NAME,
        "readonly",
      );

    const store =
      transaction.objectStore(
        STORE_NAME,
      );

    const request = store.getAll();

    request.onsuccess = () => {
      const result =
        (request.result as OfflineQueueItem[]) ??
        [];

      result.sort(
        (a, b) =>
          new Date(
            a.created_at,
          ).getTime() -
          new Date(
            b.created_at,
          ).getTime(),
      );

      resolve(result);
    };

    request.onerror = () => {
      reject(
        request.error ??
          new Error(
            "Failed to read offline queue.",
          ),
      );
    };
  });

  database.close();

  return items;
}

export async function getOfflineQueueCount(): Promise<number> {
  const database = await openDatabase();

  const count = await new Promise<number>(
    (resolve, reject) => {
      const transaction =
        database.transaction(
          STORE_NAME,
          "readonly",
        );

      const store =
        transaction.objectStore(
          STORE_NAME,
        );

      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(
          request.error ??
            new Error(
              "Failed to count offline operations.",
            ),
        );
      };
    },
  );

  database.close();

  return count;
}

async function updateOfflineOperation(
  item: OfflineQueueItem,
): Promise<void> {
  const database = await openDatabase();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        database.transaction(
          STORE_NAME,
          "readwrite",
        );

      const store =
        transaction.objectStore(
          STORE_NAME,
        );

      store.put(item);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ??
            new Error(
              "Failed to update offline operation.",
            ),
        );
      };
    },
  );

  database.close();
}

async function removeOfflineOperation(
  id: string,
): Promise<void> {
  const database = await openDatabase();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        database.transaction(
          STORE_NAME,
          "readwrite",
        );

      const store =
        transaction.objectStore(
          STORE_NAME,
        );

      store.delete(id);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ??
            new Error(
              "Failed to remove offline operation.",
            ),
        );
      };
    },
  );

  database.close();
}

function isNetworkError(
  error: unknown,
): boolean {
  return (
    error instanceof TypeError ||
    (typeof navigator !== "undefined" &&
      !navigator.onLine)
  );
}

export async function syncOfflineQueue(): Promise<{
  synced: number;
  remaining: number;
}> {
  if (
    typeof window === "undefined" ||
    !navigator.onLine
  ) {
    return {
      synced: 0,
      remaining: await getOfflineQueueCount(),
    };
  }

  const queue =
    await getOfflineQueue();

  let synced = 0;

  for (const item of queue) {
    if (!navigator.onLine) {
      break;
    }

    try {
      await apiRequest(
        item.path,
        {
          method: "POST",
          body: JSON.stringify(
            item.body,
          ),
        },
      );

      await removeOfflineOperation(
        item.id,
      );

      synced += 1;

      notifyQueueChanged();
    } catch (error) {
      /*
       * If the network disappeared while
       * syncing, stop and keep the item.
       */
      if (isNetworkError(error)) {
        break;
      }

      /*
       * This is an API/server error rather
       * than a network failure.
       *
       * Keep the item in the queue so the user
       * does not lose the operation, but record
       * the error for visibility/debugging.
       */
      const updatedItem: OfflineQueueItem = {
        ...item,
        attempts: item.attempts + 1,
        last_error:
          error instanceof Error
            ? error.message
            : "Server rejected queued operation.",
      };

      await updateOfflineOperation(
        updatedItem,
      );

      /*
       * Do not continuously hammer the API
       * with the same failed operation.
       */
      break;
    }
  }

  const remaining =
    await getOfflineQueueCount();

  notifyQueueChanged();

  return {
    synced,
    remaining,
  };
}

let syncListenerStarted = false;
let syncInProgress = false;

export function startOfflineSyncListener() {
  if (
    typeof window === "undefined" ||
    syncListenerStarted
  ) {
    return;
  }

  syncListenerStarted = true;

  const sync = async () => {
    if (
      syncInProgress ||
      !navigator.onLine
    ) {
      return;
    }

    syncInProgress = true;

    try {
      await syncOfflineQueue();
    } finally {
      syncInProgress = false;
    }
  };

  window.addEventListener(
    "online",
    sync,
  );

  /*
   * Try once when the application starts.
   * If there is no internet, syncOfflineQueue
   * simply does nothing.
   */
  void sync();
}