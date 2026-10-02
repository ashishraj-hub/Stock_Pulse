"use client";

import { useEffect, useMemo, useState } from "react";

import { getSuppliers, Supplier } from "../lib/suppliers";
import {
  createReorderPurchaseOrder,
  getReorderCenter,
  ReorderCenterItem,
} from "../lib/reorder-center";

const ORGANIZATION_ID =
  "addc299a-6ab4-4399-83ab-490ce15f3faa";

export default function ReorderCenterPage() {
  const [items, setItems] = useState<ReorderCenterItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedItem, setSelectedItem] =
    useState<ReorderCenterItem | null>(null);

  const [selectedSupplierId, setSelectedSupplierId] =
    useState("");

  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const [creating, setCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [reorderData, supplierData] = await Promise.all([
        getReorderCenter(ORGANIZATION_ID),
        getSuppliers(ORGANIZATION_ID),
      ]);

      setItems(reorderData);
      setSuppliers(supplierData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load reorder center",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const lowStockCount = items.length;

  const totalSuggestedUnits = useMemo(
    () =>
      items.reduce(
        (total, item) => total + item.suggested_quantity,
        0,
      ),
    [items],
  );

  function openPurchaseOrder(item: ReorderCenterItem) {
    setSelectedItem(item);
    setSelectedSupplierId("");
    setQuantity(String(item.suggested_quantity));
    setNotes(
      `Created from low-stock reorder suggestion for ${item.name}`,
    );
    setSuccessMessage("");
    setError("");
  }

  function closePurchaseOrder() {
    if (creating) {
      return;
    }

    setSelectedItem(null);
    setSelectedSupplierId("");
    setQuantity("");
    setNotes("");
  }

  async function handleCreatePurchaseOrder() {
    if (!selectedItem) {
      return;
    }

    if (!selectedSupplierId) {
      setError("Please select a supplier.");
      return;
    }

    const parsedQuantity = Number(quantity);

    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setError("Quantity must be a positive whole number.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setSuccessMessage("");

      const result = await createReorderPurchaseOrder(
        ORGANIZATION_ID,
        {
          item_id: selectedItem.item_id,
          supplier_id: selectedSupplierId,
          quantity: parsedQuantity,
          notes: notes.trim() || undefined,
        },
      );

      setSuccessMessage(
        `Purchase order created successfully. PO: ${result.purchase_order_id}`,
      );

      setSelectedItem(null);
      setSelectedSupplierId("");
      setQuantity("");
      setNotes("");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create purchase order",
      );
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">
            Loading reorder center...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <header>
          <p className="text-sm font-medium text-blue-400">
            PROCUREMENT
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Reorder Center
          </h1>

          <p className="mt-2 text-slate-400">
            Review low-stock items and create draft purchase
            orders from reorder recommendations.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/50 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg border border-green-800 bg-green-950/50 p-4 text-sm text-green-300">
            {successMessage}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Low-stock items
            </p>

            <p className="mt-2 text-3xl font-bold">
              {lowStockCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Suggested units
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalSuggestedUnits}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Suppliers
            </p>

            <p className="mt-2 text-3xl font-bold">
              {suppliers.length}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-5">
            <h2 className="text-lg font-semibold">
              Items requiring reorder
            </h2>
          </div>

          {items.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No items currently require reordering.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950/50">
                  <tr>
                    <th className="px-5 py-4 font-medium text-slate-400">
                      Item
                    </th>

                    <th className="px-5 py-4 font-medium text-slate-400">
                      SKU
                    </th>

                    <th className="px-5 py-4 font-medium text-slate-400">
                      Available
                    </th>

                    <th className="px-5 py-4 font-medium text-slate-400">
                      Reorder Point
                    </th>

                    <th className="px-5 py-4 font-medium text-slate-400">
                      Suggested
                    </th>

                    <th className="px-5 py-4 font-medium text-slate-400">
                      Lead Time
                    </th>

                    <th className="px-5 py-4 font-medium text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.item_id}
                      className="border-b border-slate-800 last:border-b-0"
                    >
                      <td className="px-5 py-4 font-medium">
                        {item.name}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {item.sku}
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-semibold text-red-400">
                          {item.available_quantity}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {item.reorder_point}
                      </td>

                      <td className="px-5 py-4 font-semibold text-blue-400">
                        {item.suggested_quantity}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {item.lead_time_days} days
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            openPurchaseOrder(item)
                          }
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                        >
                          Create PO
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedItem && (
          <section className="rounded-xl border border-blue-800 bg-slate-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-blue-400">
                  CREATE DRAFT PURCHASE ORDER
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  {selectedItem.name}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  SKU: {selectedItem.sku}
                </p>
              </div>

              <button
                type="button"
                onClick={closePurchaseOrder}
                className="text-sm text-slate-400 hover:text-white"
                disabled={creating}
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Supplier
                </label>

                <select
                  value={selectedSupplierId}
                  onChange={(event) =>
                    setSelectedSupplierId(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                >
                  <option value="">
                    Select supplier
                  </option>

                  {suppliers.map((supplier) => (
                    <option
                      key={supplier.id}
                      value={supplier.id}
                    >
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Quantity
                </label>

                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Suggested quantity:{" "}
                  {selectedItem.suggested_quantity}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Notes
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closePurchaseOrder}
                disabled={creating}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreatePurchaseOrder}
                disabled={creating}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating
                  ? "Creating..."
                  : "Create Draft PO"}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}