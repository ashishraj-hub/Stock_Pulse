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
  receiveStock,
  recordWastage,
  transferStock,
} from "../lib/stock-operations";

type OperationType =
  | "receive"
  | "issue"
  | "wastage"
  | "transfer"
  | "fefo";

export default function StockOperationsPage() {
  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [inventory, setInventory] =
    useState<InventoryListItem[]>([]);

  const [operation, setOperation] =
    useState<OperationType>("receive");

  // Used by normal operations:
  // Receive, Issue, Wastage, Transfer
  const [
    selectedInventoryLotId,
    setSelectedInventoryLotId,
  ] = useState("");

  // Used only by FEFO:
  const [selectedItemId, setSelectedItemId] =
    useState("");

  const [selectedLocationId, setSelectedLocationId] =
    useState("");

  const [destinationLocationId, setDestinationLocationId] =
    useState("");

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

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const currentUser =
          await getCurrentUser();

        setUser(currentUser);

        const inventoryItems =
          await getInventory(
            currentUser.organization_id,
          );

        setInventory(inventoryItems);
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

    loadData();
  }, []);

  /*
   * Normal-operation selected inventory lot.
   *
   * Used for:
   * Receive
   * Issue
   * Wastage
   * Transfer
   */
  const selectedLot =
    inventory.find(
      (item) =>
        item.inventory_lot_id ===
        selectedInventoryLotId,
    ) ?? null;

  /*
   * Inventory lots available for normal operations.
   *
   * Receive can use any existing inventory lot.
   *
   * Issue, Wastage and Transfer should only use
   * lots that currently have available stock.
   */
  const availableLots = useMemo(() => {
    if (operation === "receive") {
      return inventory;
    }

    return inventory.filter(
      (item) => item.available_quantity > 0,
    );
  }, [inventory, operation]);

  /*
   * Unique locations from inventory.
   *
   * Used by Transfer as the destination list.
   */
  const locationOptions = useMemo(() => {
    const locations = new Map<
      string,
      string
    >();

    for (const item of inventory) {
      locations.set(
        item.location_id,
        item.location_name,
      );
    }

    return Array.from(
      locations.entries(),
    ).map(
      ([id, name]) => ({
        id,
        name,
      }),
    );
  }, [inventory]);

  /*
   * Unique items from inventory.
   *
   * Used by FEFO.
   *
   * FEFO does NOT select a batch.
   * The backend chooses the earliest-expiring
   * batch automatically.
   */
  const itemOptions = useMemo(() => {
    const items = new Map<
      string,
      string
    >();

    for (const item of inventory) {
      items.set(
        item.item_id,
        item.item_name,
      );
    }

    return Array.from(
      items.entries(),
    ).map(
      ([id, name]) => ({
        id,
        name,
      }),
    );
  }, [inventory]);

  /*
   * Locations that contain available stock
   * for the currently selected FEFO item.
   */
  const fefoLocationOptions = useMemo(() => {
    if (!selectedItemId) {
      return [];
    }

    const locations = new Map<
      string,
      string
    >();

    for (const item of inventory) {
      if (
        item.item_id === selectedItemId &&
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
    ).map(
      ([id, name]) => ({
        id,
        name,
      }),
    );
  }, [
    inventory,
    selectedItemId,
  ]);

  /*
   * If a normal-operation inventory lot
   * disappears after refreshing/filtering,
   * clear the selection.
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

    if (!stillExists) {
      setSelectedInventoryLotId("");
    }
  }, [
    availableLots,
    selectedInventoryLotId,
    operation,
  ]);

  /*
   * When changing away from FEFO, clear its
   * item/location selections.
   */
  useEffect(() => {
    if (operation !== "fefo") {
      setSelectedItemId("");
      setSelectedLocationId("");
    }
  }, [operation]);

  /*
   * When changing to FEFO, clear the normal
   * inventory-lot selection.
   *
   * This prevents an old lot selection from
   * accidentally being reused.
   */
  useEffect(() => {
    if (operation === "fefo") {
      setSelectedInventoryLotId("");
    }
  }, [operation]);

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

    /*
     * Quantity validation
     */
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
     * Normal operations require an inventory lot.
     *
     * FEFO is intentionally excluded because
     * FEFO selects item + location instead.
     */
    if (
      !selectedLot &&
      operation !== "fefo"
    ) {
      setError(
        "Please select an inventory lot.",
      );
      return;
    }

    /*
     * FEFO requires an item.
     */
    if (
      operation === "fefo" &&
      !selectedItemId
    ) {
      setError(
        "Please select an item.",
      );
      return;
    }

    /*
     * FEFO requires a location.
     */
    if (
      operation === "fefo" &&
      !selectedLocationId
    ) {
      setError(
        "Please select a location.",
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
     * Transfer cannot use the same location
     * as source and destination.
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

      /*
       * RECEIVE
       */
      if (operation === "receive") {
        await receiveStock(
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
      }

      /*
       * ISSUE
       */
      if (operation === "issue") {
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
      }

      /*
       * WASTAGE
       */
      if (operation === "wastage") {
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
      }

      /*
       * TRANSFER
       */
      if (operation === "transfer") {
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
      }

      /*
       * FEFO
       *
       * IMPORTANT:
       * We send only item + location + quantity.
       *
       * We do NOT send a batch.
       *
       * The backend decides which batch/batches
       * should be consumed according to FEFO.
       */
      if (operation === "fefo") {
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
      }

      /*
       * Success message
       */
      if (operation === "fefo") {
        setMessage(
          "FEFO issue completed successfully. Stock was issued from the earliest-expiring batches.",
        );
      } else {
        setMessage(
          "Stock operation completed successfully.",
        );
      }

      /*
       * Clear common fields.
       */
      setQuantity("");
      setReason("");

      /*
       * Clear normal-operation selections.
       */
      setSelectedInventoryLotId("");

      /*
       * Clear FEFO selections.
       */
      if (operation === "fefo") {
        setSelectedItemId("");
        setSelectedLocationId("");
      }

      /*
       * Clear transfer destination.
       */
      if (operation === "transfer") {
        setDestinationLocationId("");
      }

      /*
       * Refresh inventory after the operation.
       *
       * This is especially important for FEFO because
       * multiple batches can change during one operation.
       */
      const refreshedInventory =
        await getInventory(
          organizationId,
        );

      setInventory(
        refreshedInventory,
      );
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

  /*
   * Loading state
   */
  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <p>
          Loading stock operations...
        </p>
      </main>
    );
  }

  /*
   * Authentication/load error
   */
  if (error && !user) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold">
          Stock Operations
        </h1>

        <p className="mt-4 text-red-600">
          {error}
        </p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  /*
   * RBAC:
   *
   * Admin and Staff can perform stock operations.
   * Viewer can only view inventory/dashboard.
   */
  const canOperate =
    user.role === "admin" ||
    user.role === "staff";

  if (!canOperate) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold">
            Stock Operations
          </h1>

          <p className="mt-4 text-red-600">
            Your role does not have
            permission to perform stock
            operations.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Stock Operations
          </h1>

          <p className="mt-2 text-gray-600">
            Welcome, {user.name}
          </p>

          <p className="text-sm text-gray-500">
            Role: {user.role}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border bg-white p-6 shadow-sm"
        >
          <div className="space-y-6">
            {/* Operation */}
            <div>
              <label className="block text-sm font-medium">
                Operation
              </label>

              <select
                value={operation}
                onChange={(event) =>
                  setOperation(
                    event.target
                      .value as OperationType,
                  )
                }
                className="mt-2 w-full rounded-lg border px-3 py-2"
              >
                <option value="receive">
                  Receive Stock
                </option>

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

            {/* 
              FEFO uses:
              Item + Location

              Normal operations use:
              Inventory Lot
            */}
            {operation === "fefo" ? (
              <>
                {/* FEFO Item */}
                <div>
                  <label className="block text-sm font-medium">
                    Item
                  </label>

                  <select
                    value={selectedItemId}
                    onChange={(event) => {
                      setSelectedItemId(
                        event.target.value,
                      );

                      /*
                       * Changing the item invalidates
                       * the previously selected location.
                       */
                      setSelectedLocationId("");
                    }}
                    className="mt-2 w-full rounded-lg border px-3 py-2"
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

                {/* FEFO Location */}
                <div>
                  <label className="block text-sm font-medium">
                    Location
                  </label>

                  <select
                    value={selectedLocationId}
                    onChange={(event) =>
                      setSelectedLocationId(
                        event.target.value,
                      )
                    }
                    disabled={
                      !selectedItemId
                    }
                    className="mt-2 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
                  >
                    <option value="">
                      Select location
                    </option>

                    {fefoLocationOptions.map(
                      (location) => (
                        <option
                          key={location.id}
                          value={location.id}
                        >
                          {location.name}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                {/* FEFO explanation */}
                <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                  <p className="font-medium">
                    FEFO will automatically use
                    the earliest-expiring stock.
                  </p>

                  <p className="mt-1">
                    You do not need to select a
                    batch. The system will choose
                    the appropriate batch or batches.
                  </p>
                </div>
              </>
            ) : (
              /* Normal operations */
              <div>
                <label className="block text-sm font-medium">
                  Inventory Lot
                </label>

                <select
                  value={
                    selectedInventoryLotId
                  }
                  onChange={(event) =>
                    setSelectedInventoryLotId(
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-lg border px-3 py-2"
                >
                  <option value="">
                    Select item / batch / location
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
                        {item.location_name}{" "}
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

            {/* Selected lot information */}
            {selectedLot &&
              operation !== "fefo" && (
                <div className="rounded-lg bg-gray-50 p-4 text-sm">
                  <p>
                    <strong>
                      Item:
                    </strong>{" "}
                    {selectedLot.item_name}
                  </p>

                  <p>
                    <strong>
                      SKU:
                    </strong>{" "}
                    {selectedLot.sku}
                  </p>

                  <p>
                    <strong>
                      Lot:
                    </strong>{" "}
                    {selectedLot.lot_number}
                  </p>

                  <p>
                    <strong>
                      Location:
                    </strong>{" "}
                    {
                      selectedLot.location_name
                    }
                  </p>

                  <p>
                    <strong>
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
                <label className="block text-sm font-medium">
                  Destination Location
                </label>

                <select
                  value={
                    destinationLocationId
                  }
                  onChange={(event) =>
                    setDestinationLocationId(
                      event.target.value,
                    )
                  }
                  className="mt-2 w-full rounded-lg border px-3 py-2"
                >
                  <option value="">
                    Select destination
                  </option>

                  {locationOptions.map(
                    (location) => (
                      <option
                        key={location.id}
                        value={location.id}
                      >
                        {location.name}
                      </option>
                    ),
                  )}
                </select>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium">
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
                className="mt-2 w-full rounded-lg border px-3 py-2"
                placeholder="Enter quantity"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium">
                Reason

                {operation ===
                  "wastage" && (
                  <span className="text-red-600">
                    {" "}
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
                className="mt-2 w-full rounded-lg border px-3 py-2"
                placeholder="Optional reason"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-600">
                {error}
              </p>
            )}

            {/* Success */}
            {message && (
              <p className="text-green-600">
                {message}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-black px-5 py-2.5 text-white disabled:opacity-50"
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