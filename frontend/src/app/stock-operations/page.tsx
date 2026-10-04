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

  // Used by normal operations:
  // Issue, Wastage, Transfer
  const [
    selectedInventoryLotId,
    setSelectedInventoryLotId,
  ] = useState("");

  // Used only by FEFO.
  // FEFO chooses item + location, not a batch.
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

  // If this page was opened from the scanner,
  // this contains the scanned item's ID.
  const [scannedItemId, setScannedItemId] =
    useState("");

  /*
   * Load authenticated user and inventory.
   *
   * We also read optional URL parameters:
   *
   * /stock-operations?itemId=...&operation=issue
   *
   * These parameters are supplied by the barcode
   * scanner when the user chooses an operation.
   */
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams(
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

    loadData();
  }, []);

  /*
   * Currently selected normal-operation lot.
   */
  const selectedLot =
    inventory.find(
      (item) =>
        item.inventory_lot_id ===
        selectedInventoryLotId,
    ) ?? null;

  /*
   * Available lots for normal operations.
   *
   * Issue/Wastage/Transfer:
   *   only lots with available stock
   */
  const availableLots = useMemo(() => {
    return inventory.filter(
      (item) =>
        item.available_quantity > 0,
    );
  }, [inventory]);

  /*
   * Unique locations.
   */
  const locationOptions = useMemo(() => {
    const locations =
      new Map<
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
   * Unique items.
   *
   * Used by FEFO.
   */
  const itemOptions = useMemo(() => {
    const items =
      new Map<
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
   * Locations containing available stock
   * for the selected FEFO item.
   */
  const fefoLocationOptions =
    useMemo(() => {
      if (!selectedItemId) {
        return [];
      }

      const locations =
        new Map<
          string,
          string
        >();

      for (const item of inventory) {
        if (
          item.item_id ===
            selectedItemId &&
          item.available_quantity >
            0
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
   * Scanner integration.
   *
   * If the scanner opened this page with:
   *
   * ?itemId=XYZ&operation=issue
   *
   * automatically select the matching item/lot.
   */
  useEffect(() => {
    if (
      !scannedItemId ||
      inventory.length === 0
    ) {
      return;
    }

    /*
     * FEFO:
     *
     * Select the scanned item and automatically
     * select the first location that has stock.
     */
    if (
      operation === "fefo"
    ) {
      const fefoLocation =
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

      setSelectedInventoryLotId("");

      setSelectedLocationId(
        fefoLocation?.location_id ??
          "",
      );

      return;
    }

    /*
     * Normal operations:
     *
     * Find the first matching inventory lot
     * for the scanned item.
     */
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
   * Keep the selected normal-operation lot
   * valid when filters change.
   */
  useEffect(() => {
    if (
      operation === "fefo"
    ) {
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
   * FEFO is independent of normal lot selection.
   */
  useEffect(() => {
    if (
      operation !== "fefo"
    ) {
      setSelectedItemId("");
      setSelectedLocationId("");
    }
  }, [operation]);

  /*
   * When the user manually chooses a FEFO item,
   * automatically select its first available location.
   */
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

  /*
   * Submit stock operation.
   */
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
     * Quantity validation.
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
     * FEFO uses item + location.
     *
     * Other operations use an inventory lot.
     */
    if (
      operation === "fefo"
    ) {
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
     * Source and destination cannot be identical.
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
       * ISSUE
       */
      if (
        operation === "issue"
      ) {
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
      if (
        operation === "wastage"
      ) {
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
      if (
        operation === "transfer"
      ) {
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
       * No batch is sent.
       *
       * The backend decides which
       * earliest-expiring batch/batches
       * should be consumed.
       */
      if (
        operation === "fefo"
      ) {
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
       * Success message.
       */
      if (
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
      setSelectedInventoryLotId("");
      setDestinationLocationId("");

      if (
        operation === "fefo"
      ) {
        setSelectedItemId("");
        setSelectedLocationId("");
      }

      /*
       * Refresh inventory.
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
   * Loading state.
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
   * Authentication/load error.
   */
  if (
    error &&
    !user
  ) {
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
   * Admin + Staff can perform operations.
   * Viewer cannot.
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

  /*
   * Find the scanned item for the
   * confirmation banner.
   */
  const scannedItem =
    scannedItemId
      ? inventory.find(
          (item) =>
            item.item_id ===
            scannedItemId,
        ) ?? null
      : null;

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

        {scannedItem && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">
              Scanned item loaded
            </p>

            <p className="mt-1 text-blue-800">
              {scannedItem.item_name}{" "}
              — {scannedItem.sku}
            </p>

            <p className="mt-1 text-sm text-blue-700">
              The item from the barcode
              scan has been preselected
              below.
            </p>
          </div>
        )}

        {scannedItemId &&
          !scannedItem && (
            <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="font-medium text-yellow-900">
                Scanned item was not found
                in current inventory.
              </p>

              <p className="mt-1 text-sm text-yellow-800">
                You can still select an
                inventory lot manually.
              </p>
            </div>
          )}

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
                onChange={(event) => {
                  setOperation(
                    event.target
                      .value as OperationType,
                  );

                  setMessage("");
                  setError("");
                }}
                className="mt-2 w-full rounded-lg border px-3 py-2"
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

            {/*
              FEFO:
              Item + Location

              Normal operations:
              Inventory Lot
            */}
            {operation ===
            "fefo" ? (
              <>
                <div>
                  <label className="block text-sm font-medium">
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

                <div>
                  <label className="block text-sm font-medium">
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
                    className="mt-2 w-full rounded-lg border px-3 py-2 disabled:bg-gray-100"
                  >
                    <option value="">
                      Select location
                    </option>

                    {fefoLocationOptions.map(
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

                <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                  <p className="font-medium">
                    FEFO will automatically
                    use the earliest-expiring
                    stock.
                  </p>

                  <p className="mt-1">
                    You do not need to select a
                    batch. The system chooses
                    the appropriate batch or
                    batches.
                  </p>
                </div>
              </>
            ) : (
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
                      event.target
                        .value,
                    )
                  }
                  className="mt-2 w-full rounded-lg border px-3 py-2"
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
                        {item.item_name}{" "}
                        —{" "}
                        {item.lot_number}{" "}
                        —{" "}
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
              operation !==
                "fefo" && (
                <div className="rounded-lg bg-gray-50 p-4 text-sm">
                  <p>
                    <strong>
                      Item:
                    </strong>{" "}
                    {
                      selectedLot.item_name
                    }
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
                    {
                      selectedLot.lot_number
                    }
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
                      event.target
                        .value,
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
                    event.target
                      .value,
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
                    event.target
                      .value,
                  )
                }
                rows={3}
                className="mt-2 w-full rounded-lg border px-3 py-2"
                placeholder="Optional reason"
              />
            </div>

            {error && (
              <p className="text-red-600">
                {error}
              </p>
            )}

            {message && (
              <p className="text-green-600">
                {message}
              </p>
            )}

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