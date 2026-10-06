"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getOfflineQueueCount,
  startOfflineSyncListener,
  syncOfflineQueue,
} from "../lib/offline-queue";

export default function OfflineStatus() {
  const [isOnline, setIsOnline] =
    useState(true);

  const [pendingCount, setPendingCount] =
    useState(0);

  const [syncing, setSyncing] =
    useState(false);

  const [syncMessage, setSyncMessage] =
    useState("");

  const refreshCount =
    useCallback(async () => {
      try {
        const count =
          await getOfflineQueueCount();

        setPendingCount(count);
      } catch {
        /*
         * IndexedDB may not be available
         * in some restricted environments.
         */
      }
    }, []);

  const handleSync =
    useCallback(async () => {
      if (
        !navigator.onLine ||
        syncing
      ) {
        return;
      }

      setSyncing(true);
      setSyncMessage("");

      try {
        const result =
          await syncOfflineQueue();

        setPendingCount(
          result.remaining,
        );

        if (result.synced > 0) {
          setSyncMessage(
            `${result.synced} operation${
              result.synced === 1
                ? ""
                : "s"
            } synced`,
          );
        } else if (
          result.remaining > 0
        ) {
          setSyncMessage(
            "Some operations still need attention",
          );
        }
      } catch {
        setSyncMessage(
          "Sync failed. Please try again.",
        );
      } finally {
        setSyncing(false);
      }
    }, [syncing]);

  useEffect(() => {
    setIsOnline(
      navigator.onLine,
    );

    void refreshCount();

    startOfflineSyncListener();

    const handleOnline = () => {
      setIsOnline(true);
      setSyncMessage("");

      /*
       * Give the browser a moment to establish
       * connectivity before checking the queue.
       */
      window.setTimeout(() => {
        void refreshCount();
      }, 300);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncMessage("");
    };

    const handleQueueChanged =
      () => {
        void refreshCount();
      };

    window.addEventListener(
      "online",
      handleOnline,
    );

    window.addEventListener(
      "offline",
      handleOffline,
    );

    window.addEventListener(
      "stockpulse-queue-changed",
      handleQueueChanged,
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline,
      );

      window.removeEventListener(
        "offline",
        handleOffline,
      );

      window.removeEventListener(
        "stockpulse-queue-changed",
        handleQueueChanged,
      );
    };
  }, [refreshCount]);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/60 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />

        <div className="hidden sm:block">
          <div className="text-xs font-semibold text-red-200">
            Offline
          </div>

          <div className="text-[11px] text-red-300">
            {pendingCount > 0
              ? `${pendingCount} pending`
              : "Changes will be queued"}
          </div>
        </div>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/60 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />

        <div className="hidden sm:block">
          <div className="text-xs font-semibold text-amber-200">
            {pendingCount} pending
          </div>

          <div className="text-[11px] text-amber-300">
            Waiting to sync
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void handleSync();
          }}
          disabled={syncing}
          className="rounded-md bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {syncing
            ? "Syncing..."
            : "Sync now"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/50 px-3 py-2">
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

      <div className="hidden sm:block">
        <div className="text-xs font-semibold text-emerald-200">
          Online
        </div>

        <div className="text-[11px] text-emerald-300">
          {syncMessage ||
            "All changes synced"}
        </div>
      </div>
    </div>
  );
}