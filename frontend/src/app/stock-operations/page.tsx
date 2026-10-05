"use client";

import {
  FormEvent,
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

  const [submitting, setSubmitting] =
    useState(false);

  const [scannedItemId, setScannedItemId] =
    useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

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

        const currentUser =
          await getCurrentUser();

        setUser(currentUser);

        const inventoryItems =
          await getInventory(
            currentUser.organization_id,
          );

        setInventory(
          inventoryItems,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load stock operation data",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const selectedLot =
    inventory.find(
      (item) =>
        item.inventory_lot_id ===
        selectedInventoryLotId,
    ) ?? null;

  const availableLots = useMemo(() => {
    return inventory.filter(
      (item) =>
        item.available_quantity > 0,
    );
  }, [inventory]);

  const locationOptions = useMemo(() => {
    const locations =
      new Map<string, string>();

    for (const item of inventory) {
      locations.set(
        item.location_id,
        item.location_name,
      );
    }

    return Array.from(
      locations.entries(),
    ).map(([id, name]) => ({
      id,
      name,
    }));
  }, [inventory]);

  const itemOptions = useMemo(() => {
    const items =
      new Map<string, string>();

    for (const item of inventory) {
      items.set(
        item.item_id,
        item.item_name,
      );
    }

    return Array.from(
      items.entries(),
    ).map(([id, name]) => ({
      id,
      name,
    }));
  }, [inventory]);

  const fefoLocationOptions =
    useMemo(() => {
      if (!selectedItemId) {
        return [];
      }

      const locations =
        new Map<string, string>();

      for (const item of inventory) {
        if (
          item.item_id ===
            selectedItemId &&
          item.available_quantity > 0
        ) {
          locations.set(
            item.location_id,
            item.location_name,
          );
        }
      }

      return Array.from(
        locations.entries(),
      ).map(([id, name]) => ({
        id,
        name,
      }));
    }, [
      inventory,
      selectedItemId,
    ]);

  useEffect(() => {
    if (
      !scannedItemId ||
      inventory.length === 0
    ) {
      return;
    }

    if (operation === "fefo") {
      const fefoLocation =
        inventory.find(
          (item) =>
            item.item_id ===
              scannedItemId &&
            item.available_quantity > 0,
        );

      setSelectedItemId(
        scannedItemId,
      );

      setSelectedInventoryLotId("");

      setSelectedLocationId(
        fefoLocation?.location_id ??
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
      setSelectedInventoryLotId("");
    }
  }, [
    availableLots,
    operation,
    scannedItemId,
    selectedInventoryLotId,
  ]);

  useEffect(() => {
    if (operation !== "fefo") {
      setSelectedItemId("");
      setSelectedLocationId("");
    }
  }, [operation]);

  function handleFefoItemChange(
    itemId: string,
  ) {
    setSelectedItemId(itemId);

    const firstAvailableLocation =
      inventory.find(
        (item) =>
          item.item_id === itemId &&
          item.available_quantity > 0,
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
    } else if (!selectedLot) {
      setError(
        "Please select an inventory lot.",
      );
      return;
    }

    if (
      operation === "wastage" &&
      !reason.trim()
    ) {
      setError(
        "Reason is required for wastage.",
      );
      return;
    }

    if (
      operation === "transfer" &&
      !destinationLocationId
    ) {
      setError(
        "Please select a destination location.",
      );
      return;
    }

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

      /*
       * IMPORTANT:
       *
       * Each operation returns either:
       *
       * { status: "synced", data: ... }
       *
       * OR
       *
       * { status: "queued", queue_id: ... }
       *
       * We capture that result so the UI can
       * correctly tell the user what happened.
       */

      let queuedOffline = false;

      if (operation === "issue") {
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

      if (operation === "wastage") {
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

      if (operation === "transfer") {
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

      if (operation === "fefo") {
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

      /*
       * Show the correct result to the user.
       */
      if (queuedOffline) {
        setMessage(
          "You are offline. The operation has been saved and will automatically sync when the connection returns.",
        );
      } else if (
        operation === "fefo"
      ) {
        setMessage(
          "FEFO issue completed successfully. Stock was issued from the earliest-expiring batches.",
        );
      } else {
        setMessage(
          "Stock operation completed successfully.",
        );
      }

      /*
       * Clear form fields.
       */
      setQuantity("");
      setReason("");
      setSelectedInventoryLotId(
        "",
      );
      setDestinationLocationId("");

      if (operation === "fefo") {
        setSelectedItemId("");
        setSelectedLocationId("");
      }

      /*
       * IMPORTANT:
       *
       * If the operation was queued offline,
       * the server has NOT changed inventory yet.
       *
       * Therefore we must NOT refresh inventory
       * here and pretend the server has changed.
       */
      if (!queuedOffline) {
        const refreshedInventory =
          await getInventory(
            organizationId,
          );

        setInventory(
          refreshedInventory,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Stock operation failed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <p className="text-slate-300">
          Loading stock operations...
        </p>
      </main>
    );
  }

  if (error && !user) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <h1 className="text-2xl font-bold text-white">
          Stock Operations
        </h1>

        <p className="mt-4 text-red-400">
          {error}
        </p>
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
            Your role does not have
            permission to perform stock
            operations.
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Stock Operations
          </h1>

          <p className="mt-2 text-slate-300">
            Welcome, {user.name}
          </p>

          <p className="text-sm text-slate-500">
            Role: {user.role}
          </p>
        </div>

        {scannedItem && (
          <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-950/50 p-4">
            <p className="text-sm font-semibold text-blue-200">
              Scanned item loaded
            </p>

            <p className="mt-1 text-blue-100">
              {scannedItem.item_name}{" "}
              — {scannedItem.sku}
            </p>

            <p className="mt-1 text-sm text-blue-300">
              The item from the barcode
              scan has been preselected
              below.
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

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
        >
          <div className="space-y-6">
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
                          {item.name}
                        </option>
                      ),
                    )}
                  </select>
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
                </div>

                <div className="rounded-lg border border-blue-500/20 bg-blue-950/40 p-4 text-sm text-blue-200">
                  <p className="font-medium">
                    FEFO will automatically
                    use the earliest-expiring
                    stock.
                  </p>

                  <p className="mt-1 text-blue-300">
                    You do not need to select a
                    batch. The system chooses
                    the appropriate batch or
                    batches.
                  </p>
                </div>
              </>
            ) : (
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
                        {
                          item.location_name
                        }{" "}
                        — Available:{" "}
                        {
                          item.available_quantity
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>
            )}

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

            {operation === "transfer" && (
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
                        key={location.id}
                        value={
                          location.id
                        }
                      >
                        {location.name}
                      </option>
                    ),
                  )}
                </select>
              </div>
            )}

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
                placeholder="Optional reason"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-950/50 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/50 p-3 text-sm text-emerald-300">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
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