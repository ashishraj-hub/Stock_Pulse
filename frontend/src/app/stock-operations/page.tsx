"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentUser,
  type CurrentUser,
} from "../lib/auth";

import {
  getInventory,
  type InventoryListItem,
} from "../lib/inventory";

import {
  getLocations,
  type Location,
} from "../lib/locations";

import {
  getItems,
  type Item,
} from "../lib/items";

import {
  fefoIssueStock,
  issueStock,
  recordWastage,
  transferStock,
} from "../lib/stock-operations";

type OperationType =
  | "issue"
  | "wastage"
  | "transfer"
  | "fefo";

const VALID_OPERATIONS: OperationType[] = [
  "issue",
  "wastage",
  "transfer",
  "fefo",
];

function isOperationType(
  value: string | null,
): value is OperationType {
  return (
    value !== null &&
    VALID_OPERATIONS.includes(
      value as OperationType,
    )
  );
}

export default function StockOperationsPage() {
  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [inventory, setInventory] =
    useState<InventoryListItem[]>([]);

  /*
   * IMPORTANT:
   *
   * Locations are loaded independently from inventory.
   * Therefore a newly-created empty location is available
   * for transfers immediately.
   */
  const [locations, setLocations] =
    useState<Location[]>([]);

  /*
   * Items are also loaded independently from inventory.
   * Therefore a newly-created item appears in FEFO.
   */
  const [items, setItems] =
    useState<Item[]>([]);

  const [operation, setOperation] =
    useState<OperationType>("issue");

  const [
    selectedInventoryLotId,
    setSelectedInventoryLotId,
  ] = useState("");

  const [selectedItemId, setSelectedItemId] =
    useState("");

  const [selectedLocationId, setSelectedLocationId] =
    useState("");

  const [
    destinationLocationId,
    setDestinationLocationId,
  ] = useState("");

  const [quantity, setQuantity] =
    useState("");

  const [reason, setReason] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [scannedItemId, setScannedItemId] =
    useState("");

  /*
   * Load ALL master/operational data.
   *
   * Inventory:
   *   used for actual stock lots
   *
   * Locations:
   *   used for transfer destinations
   *
   * Items:
   *   used for FEFO item selection
   */
  const loadData = useCallback(
    async (initialLoad = false) => {
      try {
        if (initialLoad) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        const currentUser =
          await getCurrentUser();

        setUser(currentUser);

        const organizationId =
          currentUser.organization_id;

        const [
          inventoryItems,
          locationList,
          itemList,
        ] = await Promise.all([
          getInventory(
            organizationId,
          ),
          getLocations(
            organizationId,
          ),
          getItems(
            organizationId,
          ),
        ]);

        setInventory(
          inventoryItems,
        );

        setLocations(
          locationList,
        );

        setItems(
          itemList,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load stock operation data.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  /*
   * Initial load + scanner URL handling.
   */
  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const itemIdFromUrl =
      params.get("itemId") ?? "";

    const operationFromUrl =
      params.get("operation");

    setScannedItemId(
      itemIdFromUrl,
    );

    if (
      isOperationType(
        operationFromUrl,
      )
    ) {
      setOperation(
        operationFromUrl,
      );
    }

    void loadData(true);
  }, [loadData]);

  /*
   * Refresh when the user returns to this page.
   *
   * Example:
   *
   * Stock Operations
   *       ↓
   * Locations
   *       ↓
   * Create "Cold Storage"
   *       ↓
   * Return to Stock Operations
   *       ↓
   * Cold Storage is automatically loaded.
   */
  useEffect(() => {
    function refreshWhenVisible() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void loadData(false);
      }
    }

    window.addEventListener(
      "focus",
      refreshWhenVisible,
    );

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible,
    );

    return () => {
      window.removeEventListener(
        "focus",
        refreshWhenVisible,
      );

      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );
    };
  }, [loadData]);

  /*
   * Also refresh every 30 seconds while the page
   * is visible.
   *
   * This allows another browser/page to create
   * master data without leaving this page.
   */
  useEffect(() => {
    const interval =
      window.setInterval(() => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void loadData(false);
        }
      }, 30000);

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [loadData]);

  const selectedLot =
    inventory.find(
      (item) =>
        item.inventory_lot_id ===
        selectedInventoryLotId,
    ) ?? null;

  /*
   * Lots that can actually be issued/wasted/transferred.
   */
  const availableLots =
    useMemo(() => {
      return inventory.filter(
        (item) =>
          item.available_quantity > 0,
      );
    }, [inventory]);

  /*
   * IMPORTANT:
   *
   * ALL locations are shown.
   *
   * We do NOT build this list from inventory.
   *
   * This is what allows a newly-created empty
   * location to appear as a transfer destination.
   */
  const locationOptions =
    useMemo(() => {
      return locations
        .map((location) => ({
          id: location.id,
          name: location.name,
        }))
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
          ),
        );
    }, [locations]);

  /*
   * ALL organization items are shown.
   *
   * This is what allows newly-created items to
   * appear even before they have inventory.
   */
  const itemOptions =
    useMemo(() => {
      return items
        .map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
        }))
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
          ),
        );
    }, [items]);

  /*
   * FEFO locations are different from transfer
   * destinations.
   *
   * FEFO can only operate where the selected item
   * currently has available stock.
   */
  const fefoLocationOptions =
    useMemo(() => {
      if (!selectedItemId) {
        return [];
      }

      const locationMap =
        new Map<string, string>();

      for (const inventoryItem of inventory) {
        if (
          inventoryItem.item_id ===
            selectedItemId &&
          inventoryItem.available_quantity >
            0
        ) {
          locationMap.set(
            inventoryItem.location_id,
            inventoryItem.location_name,
          );
        }
      }

      return Array.from(
        locationMap.entries(),
      )
        .map(([id, name]) => ({
          id,
          name,
        }))
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
          ),
        );
    }, [
      inventory,
      selectedItemId,
    ]);

  /*
   * Handle barcode/scanner item selection.
   */
  useEffect(() => {
    if (
      !scannedItemId ||
      inventory.length === 0
    ) {
      return;
    }

    if (operation === "fefo") {
      const firstAvailableLocation =
        inventory.find(
          (item) =>
            item.item_id ===
              scannedItemId &&
            item.available_quantity >
              0,
        );

      setSelectedItemId(
        scannedItemId,
      );

      setSelectedInventoryLotId(
        "",
      );

      setSelectedLocationId(
        firstAvailableLocation?.location_id ??
          "",
      );

      return;
    }

    const matchingLot =
      availableLots.find(
        (item) =>
          item.item_id ===
          scannedItemId,
      );

    setSelectedInventoryLotId(
      matchingLot?.inventory_lot_id ??
        "",
    );

    setSelectedItemId("");
    setSelectedLocationId("");
  }, [
    availableLots,
    inventory,
    operation,
    scannedItemId,
  ]);

  /*
   * Make sure a selected inventory lot still exists
   * after a refresh.
   */
  useEffect(() => {
    if (operation === "fefo") {
      return;
    }

    const stillExists =
      availableLots.some(
        (item) =>
          item.inventory_lot_id ===
          selectedInventoryLotId,
      );

    if (
      !stillExists &&
      !scannedItemId
    ) {
      setSelectedInventoryLotId(
        "",
      );
    }
  }, [
    availableLots,
    operation,
    scannedItemId,
    selectedInventoryLotId,
  ]);

  /*
   * Clear FEFO-specific fields when switching
   * to another operation.
   */
  useEffect(() => {
    if (operation !== "fefo") {
      setSelectedItemId("");
      setSelectedLocationId("");
    }
  }, [operation]);

  /*
   * If a location disappears while this page is open,
   * clear the stale destination selection.
   */
  useEffect(() => {
    if (
      !destinationLocationId
    ) {
      return;
    }

    const exists =
      locations.some(
        (location) =>
          location.id ===
          destinationLocationId,
      );

    if (!exists) {
      setDestinationLocationId(
        "",
      );
    }
  }, [
    destinationLocationId,
    locations,
  ]);

  function handleFefoItemChange(
    itemId: string,
  ) {
    setSelectedItemId(
      itemId,
    );

    const firstAvailableLocation =
      inventory.find(
        (item) =>
          item.item_id ===
            itemId &&
          item.available_quantity >
            0,
      );

    setSelectedLocationId(
      firstAvailableLocation?.location_id ??
        "",
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setMessage("");
    setError("");

    const numericQuantity =
      Number(quantity);

    if (
      !Number.isInteger(
        numericQuantity,
      ) ||
      numericQuantity <= 0
    ) {
      setError(
        "Quantity must be a positive whole number.",
      );
      return;
    }

    /*
     * FEFO requires item + location.
     */
    if (operation === "fefo") {
      if (!selectedItemId) {
        setError(
          "Please select an item.",
        );
        return;
      }

      if (!selectedLocationId) {
        setError(
          "Please select a location.",
        );
        return;
      }
    }

    /*
     * Normal operations require an actual
     * inventory lot with available stock.
     */
    if (
      operation !== "fefo" &&
      !selectedLot
    ) {
      setError(
        "Please select an inventory lot.",
      );
      return;
    }

    /*
     * Wastage requires a reason.
     */
    if (
      operation === "wastage" &&
      !reason.trim()
    ) {
      setError(
        "Reason is required for wastage.",
      );
      return;
    }

    /*
     * Transfer requires a destination.
     */
    if (
      operation === "transfer" &&
      !destinationLocationId
    ) {
      setError(
        "Please select a destination location.",
      );
      return;
    }

    /*
     * Prevent same-location transfer.
     */
    if (
      operation === "transfer" &&
      selectedLot &&
      destinationLocationId ===
        selectedLot.location_id
    ) {
      setError(
        "Source and destination locations must be different.",
      );
      return;
    }

    try {
      setSubmitting(true);

      const organizationId =
        user.organization_id;

      let queuedOffline = false;

      if (
        operation === "issue"
      ) {
        const result =
          await issueStock(
            organizationId,
            selectedLot!.item_id,
            selectedLot!.batch_id,
            selectedLot!.location_id,
            {
              quantity:
                numericQuantity,
              reason:
                reason.trim() ||
                undefined,
            },
          );

        queuedOffline =
          result.status ===
          "queued";
      }

      if (
        operation === "wastage"
      ) {
        const result =
          await recordWastage(
            organizationId,
            selectedLot!.item_id,
            selectedLot!.batch_id,
            selectedLot!.location_id,
            {
              quantity:
                numericQuantity,
              reason:
                reason.trim(),
            },
          );

        queuedOffline =
          result.status ===
          "queued";
      }

      if (
        operation === "transfer"
      ) {
        const result =
          await transferStock(
            organizationId,
            selectedLot!.item_id,
            selectedLot!.batch_id,
            selectedLot!.location_id,
            {
              quantity:
                numericQuantity,
              destination_location_id:
                destinationLocationId,
              reason:
                reason.trim() ||
                undefined,
            },
          );

        queuedOffline =
          result.status ===
          "queued";
      }

      if (
        operation === "fefo"
      ) {
        const result =
          await fefoIssueStock(
            organizationId,
            selectedItemId,
            selectedLocationId,
            {
              quantity:
                numericQuantity,
              reason:
                reason.trim() ||
                undefined,
            },
          );

        queuedOffline =
          result.status ===
          "queued";
      }

      if (queuedOffline) {
        setMessage(
          "You are offline. The operation has been saved and will automatically sync when the connection returns.",
        );
      } else if (
        operation === "fefo"
      ) {
        setMessage(
          "FEFO issue completed successfully.",
        );
      } else {
        setMessage(
          "Stock operation completed successfully.",
        );
      }

      setQuantity("");
      setReason("");
      setSelectedInventoryLotId(
        "",
      );
      setDestinationLocationId(
        "",
      );

      if (
        operation === "fefo"
      ) {
        setSelectedItemId("");
        setSelectedLocationId(
          "",
        );
      }

      /*
       * Refresh server data only when the operation
       * actually reached the server.
       *
       * Offline queued operations are not refreshed
       * because the server has not changed yet.
       */
      if (!queuedOffline) {
        await loadData(false);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Stock operation failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <div className="mx-auto max-w-4xl">
          <p className="text-slate-300">
            Loading stock operations...
          </p>
        </div>
      </main>
    );
  }

  if (error && !user) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-white">
            Stock Operations
          </h1>

          <p className="mt-4 text-red-400">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const canOperate =
    user.role === "admin" ||
    user.role === "staff";

  if (!canOperate) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold text-white">
            Stock Operations
          </h1>

          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-950/50 p-4 text-red-300">
            Your role does not have permission
            to perform stock operations.
          </p>
        </div>
      </main>
    );
  }

  const scannedItem =
    scannedItemId
      ? inventory.find(
          (item) =>
            item.item_id ===
            scannedItemId,
        ) ?? null
      : null;

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Stock Operations
            </h1>

            <p className="mt-2 text-slate-300">
              Welcome, {user.name}
            </p>

            <p className="text-sm text-slate-500">
              Role: {user.role}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                {locations.length} locations
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                {items.length} items
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                {availableLots.length} available lots
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadData(false)
            }
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            >
              ↻
            </span>

            Refresh Master Data
          </button>
        </div>

        {/* Scanner result */}
        {scannedItem && (
          <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-950/50 p-4">
            <p className="text-sm font-semibold text-blue-200">
              Scanned item loaded
            </p>

            <p className="mt-1 text-blue-100">
              {scannedItem.item_name} —{" "}
              {scannedItem.sku}
            </p>

            <p className="mt-1 text-sm text-blue-300">
              The scanned item has been
              preselected below.
            </p>
          </div>
        )}

        {scannedItemId &&
          !scannedItem && (
            <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-950/50 p-4">
              <p className="font-medium text-yellow-200">
                Scanned item was not found
                in current inventory.
              </p>

              <p className="mt-1 text-sm text-yellow-300">
                You can still select an
                inventory lot manually.
              </p>
            </div>
          )}

        {/* Errors */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-950/50 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Success */}
        {message && (
          <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-950/50 p-4 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {/* Operation form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
        >
          <div className="space-y-6">

            {/* Operation */}
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Operation
              </label>

              <select
                value={operation}
                onChange={(event) => {
                  setOperation(
                    event.target
                      .value as OperationType,
                  );

                  setMessage("");
                  setError("");
                }}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none focus:border-blue-500"
              >
                <option value="issue">
                  Issue Stock
                </option>

                <option value="wastage">
                  Record Wastage
                </option>

                <option value="transfer">
                  Transfer Stock
                </option>

                <option value="fefo">
                  FEFO Issue
                </option>
              </select>
            </div>

            {/* FEFO */}
            {operation === "fefo" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Item
                  </label>

                  <select
                    value={
                      selectedItemId
                    }
                    onChange={(event) =>
                      handleFefoItemChange(
                        event.target
                          .value,
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">
                      Select item
                    </option>

                    {itemOptions.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.name} —{" "}
                          {item.sku}
                        </option>
                      ),
                    )}
                  </select>

                  {itemOptions.length ===
                    0 && (
                    <p className="mt-2 text-xs text-amber-400">
                      No items exist yet.
                      Create an item first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200">
                    Location
                  </label>

                  <select
                    value={
                      selectedLocationId
                    }
                    onChange={(event) =>
                      setSelectedLocationId(
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      !selectedItemId
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800/50 disabled:text-slate-500"
                  >
                    <option value="">
                      Select location
                    </option>

                    {fefoLocationOptions.map(
                      (location) => (
                        <option
                          key={
                            location.id
                          }
                          value={
                            location.id
                          }
                        >
                          {location.name}
                        </option>
                      ),
                    )}
                  </select>

                  {selectedItemId &&
                    fefoLocationOptions.length ===
                      0 && (
                    <p className="mt-2 text-xs text-amber-400">
                      This item has no available
                      stock at any location.
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-blue-500/20 bg-blue-950/40 p-4 text-sm text-blue-200">
                  <p className="font-medium">
                    FEFO automatically uses
                    the earliest-expiring stock.
                  </p>

                  <p className="mt-1 text-blue-300">
                    You do not need to select
                    a batch manually.
                  </p>
                </div>
              </>
            ) : (
              /* Normal operations */
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Inventory Lot
                </label>

                <select
                  value={
                    selectedInventoryLotId
                  }
                  onChange={(event) =>
                    setSelectedInventoryLotId(
                      event.target
                        .value,
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                >
                  <option value="">
                    Select item / batch /
                    location
                  </option>

                  {availableLots.map(
                    (item) => (
                      <option
                        key={
                          item.inventory_lot_id
                        }
                        value={
                          item.inventory_lot_id
                        }
                      >
                        {item.item_name} —{" "}
                        {item.lot_number} —{" "}
                        {item.location_name} —{" "}
                        Available:{" "}
                        {
                          item.available_quantity
                        }
                      </option>
                    ),
                  )}
                </select>

                {availableLots.length ===
                  0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    No inventory lots currently
                    have available stock.
                  </p>
                )}
              </div>
            )}

            {/* Selected inventory */}
            {selectedLot &&
              operation !== "fefo" && (
                <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-sm text-slate-200">
                  <p>
                    <strong className="text-white">
                      Item:
                    </strong>{" "}
                    {
                      selectedLot.item_name
                    }
                  </p>

                  <p>
                    <strong className="text-white">
                      SKU:
                    </strong>{" "}
                    {selectedLot.sku}
                  </p>

                  <p>
                    <strong className="text-white">
                      Lot:
                    </strong>{" "}
                    {
                      selectedLot.lot_number
                    }
                  </p>

                  <p>
                    <strong className="text-white">
                      Location:
                    </strong>{" "}
                    {
                      selectedLot.location_name
                    }
                  </p>

                  <p>
                    <strong className="text-white">
                      Available:
                    </strong>{" "}
                    {
                      selectedLot.available_quantity
                    }
                  </p>
                </div>
              )}

            {/* Transfer destination */}
            {operation ===
              "transfer" && (
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Destination Location
                </label>

                <select
                  value={
                    destinationLocationId
                  }
                  onChange={(event) =>
                    setDestinationLocationId(
                      event.target
                        .value,
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none focus:border-blue-500"
                >
                  <option value="">
                    Select destination
                  </option>

                  {locationOptions.map(
                    (location) => (
                      <option
                        key={
                          location.id
                        }
                        value={
                          location.id
                        }
                      >
                        {location.name}
                      </option>
                    ),
                  )}
                </select>

                {locationOptions.length ===
                  0 && (
                  <p className="mt-2 text-xs text-amber-400">
                    No locations exist.
                    Create a location first.
                  </p>
                )}

                <p className="mt-2 text-xs text-slate-500">
                  All organization locations
                  are shown, including empty
                  newly-created locations.
                </p>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Quantity
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                placeholder="Enter quantity"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-slate-200">
                Reason{" "}
                {operation ===
                  "wastage" && (
                  <span className="text-red-400">
                    *
                  </span>
                )}
              </label>

              <textarea
                value={reason}
                onChange={(event) =>
                  setReason(
                    event.target.value,
                  )
                }
                rows={3}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                placeholder={
                  operation ===
                  "wastage"
                    ? "Why was this stock wasted?"
                    : "Optional reason"
                }
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={
                submitting ||
                (operation ===
                  "transfer" &&
                  locationOptions.length ===
                    0)
              }
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Processing..."
                : "Submit Operation"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}