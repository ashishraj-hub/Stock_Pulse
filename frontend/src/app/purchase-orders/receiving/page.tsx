"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getCurrentUser,
  type CurrentUser,
} from "../../lib/auth";

import {
  getPurchaseOrder,
  type PurchaseOrder,
} from "../../lib/purchase-orders";

import {
  getLocations,
  type Location,
} from "../../lib/locations";

import {
  receivePurchaseOrder,
} from "../../lib/purchase-order-receiving";

const ORGANIZATION_ID =
  "addc299a-6ab4-4399-83ab-490ce15f3faa";

export default function PurchaseOrderReceivingPage() {
  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [purchaseOrder, setPurchaseOrder] =
    useState<PurchaseOrder | null>(null);

  const [locations, setLocations] =
    useState<Location[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [selectedItemId, setSelectedItemId] =
    useState("");

  const [selectedLocationId, setSelectedLocationId] =
    useState("");

  const [quantity, setQuantity] =
    useState("");

  const [lotNumber, setLotNumber] =
    useState("");

  const [expiryDate, setExpiryDate] =
    useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams(
        window.location.search,
      );

      const purchaseOrderId =
        params.get("purchaseOrderId");

      if (!purchaseOrderId) {
        setError(
          "Purchase order ID is missing from the URL.",
        );
        return;
      }

      const [
        currentUser,
        selectedPurchaseOrder,
        organizationLocations,
      ] = await Promise.all([
        getCurrentUser(),

        getPurchaseOrder(
          ORGANIZATION_ID,
          purchaseOrderId,
        ),

        getLocations(
          ORGANIZATION_ID,
        ),
      ]);

      setUser(currentUser);
      setPurchaseOrder(
        selectedPurchaseOrder,
      );
      setLocations(
        organizationLocations,
      );

      if (
        selectedPurchaseOrder.items.length > 0
      ) {
        const firstReceivableItem =
          selectedPurchaseOrder.items.find(
            (item) =>
              item.quantity -
                item.received_quantity >
              0,
          );

        if (firstReceivableItem) {
          setSelectedItemId(
            firstReceivableItem.id,
          );
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load purchase order receiving data.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedItem =
    purchaseOrder?.items.find(
      (item) => item.id === selectedItemId,
    ) ?? null;

  const remainingQuantity =
    selectedItem
      ? selectedItem.quantity -
        selectedItem.received_quantity
      : 0;

  const itemSummary = useMemo(() => {
    if (!purchaseOrder) {
      return {
        totalOrdered: 0,
        totalReceived: 0,
        totalRemaining: 0,
      };
    }

    return purchaseOrder.items.reduce(
      (summary, item) => {
        const remaining =
          item.quantity -
          item.received_quantity;

        return {
          totalOrdered:
            summary.totalOrdered +
            item.quantity,

          totalReceived:
            summary.totalReceived +
            item.received_quantity,

          totalRemaining:
            summary.totalRemaining +
            remaining,
        };
      },
      {
        totalOrdered: 0,
        totalReceived: 0,
        totalRemaining: 0,
      },
    );
  }, [purchaseOrder]);

  async function handleReceive() {
    setError("");
    setSuccess("");

    if (!purchaseOrder) {
      setError(
        "Purchase order is not loaded.",
      );
      return;
    }

    if (!selectedItemId) {
      setError(
        "Please select a purchase order item.",
      );
      return;
    }

    if (!selectedLocationId) {
      setError(
        "Please select a receiving location.",
      );
      return;
    }

    if (!lotNumber.trim()) {
      setError(
        "Lot number is required.",
      );
      return;
    }

    const parsedQuantity =
      Number(quantity);

    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setError(
        "Quantity must be a positive whole number.",
      );
      return;
    }

    if (
      parsedQuantity >
      remainingQuantity
    ) {
      setError(
        `You can receive at most ${remainingQuantity} unit(s) for this item.`,
      );
      return;
    }

    try {
      setSubmitting(true);

      const updatedPurchaseOrder =
        await receivePurchaseOrder(
          ORGANIZATION_ID,
          purchaseOrder.id,
          {
            items: [
              {
                purchase_order_item_id:
                  selectedItemId,

                location_id:
                  selectedLocationId,

                quantity:
                  parsedQuantity,

                lot_number:
                  lotNumber.trim(),

                expiry_date:
                  expiryDate || null,
              },
            ],
          },
        );

      setPurchaseOrder(
        updatedPurchaseOrder,
      );

      setSuccess(
        `Successfully received ${parsedQuantity} unit(s).`,
      );

      setQuantity("");
      setLotNumber("");
      setExpiryDate("");

      const nextReceivableItem =
        updatedPurchaseOrder.items.find(
          (item) =>
            item.quantity -
              item.received_quantity >
            0,
        );

      if (nextReceivableItem) {
        setSelectedItemId(
          nextReceivableItem.id,
        );
      } else {
        setSelectedItemId("");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to receive stock.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-slate-500">
            Loading purchase order receiving...
          </p>
        </div>
      </main>
    );
  }

  if (error && !purchaseOrder) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold text-slate-900">
            Purchase Order Receiving
          </h1>

          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!user || !purchaseOrder) {
    return null;
  }

  const canReceive =
    user.role === "admin" ||
    user.role === "staff";

  if (!canReceive) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold text-slate-900">
            Purchase Order Receiving
          </h1>

          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Your role does not have permission
            to receive stock.
          </div>
        </div>
      </main>
    );
  }

  if (purchaseOrder.status !== "ordered") {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold text-slate-900">
            Purchase Order Receiving
          </h1>

          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            This purchase order cannot be
            received because its current status
            is "{purchaseOrder.status}".
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-900">
            Receive Purchase Order
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Record incoming stock against this
            ordered purchase order.
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Signed in as {user.email} · Role:{" "}
            {user.role}
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Purchase Order
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard
              label="PO ID"
              value={purchaseOrder.id}
            />

            <InfoCard
              label="Supplier"
              value={purchaseOrder.supplier_id}
            />

            <InfoCard
              label="Order Date"
              value={
                purchaseOrder.order_date
                  ? new Date(
                      purchaseOrder.order_date,
                    ).toLocaleString()
                  : "—"
              }
            />

            <InfoCard
              label="Expected Date"
              value={
                purchaseOrder.expected_date
                  ? new Date(
                      purchaseOrder.expected_date,
                    ).toLocaleString()
                  : "—"
              }
            />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total Ordered"
            value={
              itemSummary.totalOrdered
            }
          />

          <SummaryCard
            label="Total Received"
            value={
              itemSummary.totalReceived
            }
          />

          <SummaryCard
            label="Remaining"
            value={
              itemSummary.totalRemaining
            }
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Receive Stock
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select an item and record the
            quantity received into a specific
            location and lot.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Purchase Order Item
              </label>

              <select
                value={selectedItemId}
                onChange={(event) =>
                  setSelectedItemId(
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                <option value="">
                  Select item
                </option>

                {purchaseOrder.items
                  .filter(
                    (item) =>
                      item.quantity -
                        item.received_quantity >
                      0,
                  )
                  .map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.item_id} — Remaining:{" "}
                      {item.quantity -
                        item.received_quantity}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Receiving Location
              </label>

              <select
                value={selectedLocationId}
                onChange={(event) =>
                  setSelectedLocationId(
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                <option value="">
                  Select location
                </option>

                {locations.map(
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

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Quantity
              </label>

              <input
                type="number"
                min="1"
                max={remainingQuantity}
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    event.target.value,
                  )
                }
                placeholder={
                  remainingQuantity > 0
                    ? `Maximum ${remainingQuantity}`
                    : "Select an item"
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              />

              {selectedItem && (
                <p className="mt-1 text-xs text-slate-500">
                  Remaining to receive:{" "}
                  {remainingQuantity}
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Lot Number
              </label>

              <input
                type="text"
                value={lotNumber}
                onChange={(event) =>
                  setLotNumber(
                    event.target.value,
                  )
                }
                placeholder="e.g. LOT-2026-001"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Expiry Date
              </label>

              <input
                type="date"
                value={expiryDate}
                onChange={(event) =>
                  setExpiryDate(
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              />

              <p className="mt-1 text-xs text-slate-500">
                Leave empty if the batch has no
                expiry date.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleReceive}
              disabled={
                submitting ||
                !selectedItemId ||
                !selectedLocationId ||
                !quantity ||
                !lotNumber.trim()
              }
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Receiving..."
                : "Receive Stock"}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Receiving Progress
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">
                    Item ID
                  </th>

                  <th className="px-5 py-3">
                    Ordered
                  </th>

                  <th className="px-5 py-3">
                    Received
                  </th>

                  <th className="px-5 py-3">
                    Remaining
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {purchaseOrder.items.map(
                  (item) => {
                    const remaining =
                      item.quantity -
                      item.received_quantity;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs text-slate-600">
                            {item.item_id}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-900">
                          {item.quantity}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {item.received_quantity}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={
                              remaining > 0
                                ? "font-semibold text-amber-700"
                                : "font-semibold text-emerald-700"
                            }
                          >
                            {remaining}
                          </span>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}