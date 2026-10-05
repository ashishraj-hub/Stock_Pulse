"use client";

import {
  AlertCircle,
  Archive,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Package,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  archiveBatch,
  createBatch,
  getBatches,
  type Batch,
} from "../lib/batches";

import {
  getItems,
  type Item,
} from "../lib/items";

import {
  getCurrentUser,
  type CurrentUser,
} from "../lib/auth";


function formatDate(value: string | null): string {
  if (!value) {
    return "No expiry";
  }

  return new Date(value).toLocaleDateString();
}


function getExpiryStatus(
  expiryDate: string | null,
): {
  label: string;
  className: string;
} {
  if (!expiryDate) {
    return {
      label: "No expiry",
      className:
        "bg-slate-800 text-slate-300",
    };
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);

  expiry.setHours(0, 0, 0, 0);

  const difference =
    expiry.getTime() - today.getTime();

  const daysRemaining =
    Math.ceil(
      difference /
        (1000 * 60 * 60 * 24),
    );

  if (daysRemaining < 0) {
    return {
      label: "Expired",
      className:
        "bg-red-500/10 text-red-400",
    };
  }

  if (daysRemaining <= 7) {
    return {
      label: "Expiring soon",
      className:
        "bg-amber-500/10 text-amber-400",
    };
  }

  return {
    label: "Active",
    className:
      "bg-emerald-500/10 text-emerald-400",
  };
}


export default function BatchesPage() {
  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [items, setItems] =
    useState<Item[]>([]);

  const [selectedItemId, setSelectedItemId] =
    useState("");

  const [batches, setBatches] =
    useState<Batch[]>([]);

  const [loadingItems, setLoadingItems] =
    useState(true);

  const [loadingBatches, setLoadingBatches] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [archivingBatchId, setArchivingBatchId] =
    useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [lotNumber, setLotNumber] =
    useState("");

  const [expiryDate, setExpiryDate] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);


  useEffect(() => {
    loadItems();
  }, []);


  useEffect(() => {
    if (!selectedItemId) {
      setBatches([]);
      return;
    }

    loadBatches(selectedItemId);
  }, [selectedItemId]);


  async function loadItems() {
    try {
      setLoadingItems(true);
      setError(null);

      const currentUser =
        await getCurrentUser();

      setUser(currentUser);

      const itemList =
        await getItems(
          currentUser.organization_id,
        );

      setItems(itemList);

      if (itemList.length > 0) {
        setSelectedItemId(
          itemList[0].id,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load items.",
      );
    } finally {
      setLoadingItems(false);
    }
  }


  async function loadBatches(
    itemId: string,
  ) {
    if (!user) {
      return;
    }

    try {
      setLoadingBatches(true);
      setError(null);

      const batchList =
        await getBatches(
          user.organization_id,
          itemId,
        );

      setBatches(batchList);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load batches.",
      );
    } finally {
      setLoadingBatches(false);
    }
  }


  const selectedItem = useMemo(
    () =>
      items.find(
        (item) =>
          item.id === selectedItemId,
      ) ?? null,
    [items, selectedItemId],
  );


  const duplicateLotNumber =
    useMemo(() => {
      const normalized =
        lotNumber.trim().toLowerCase();

      if (!normalized) {
        return false;
      }

      return batches.some(
        (batch) =>
          !batch.is_archived &&
          batch.lot_number
            .trim()
            .toLowerCase() === normalized,
      );
    }, [lotNumber, batches]);


  function openCreateModal() {
    setLotNumber("");
    setExpiryDate("");
    setFormError(null);
    setError(null);
    setSuccess(null);
    setShowCreateModal(true);
  }


  function closeCreateModal() {
    if (creating) {
      return;
    }

    setShowCreateModal(false);
    setLotNumber("");
    setExpiryDate("");
    setFormError(null);
  }


  async function handleCreateBatch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFormError(null);
    setError(null);
    setSuccess(null);

    if (!user) {
      setFormError(
        "Authenticated user information is unavailable.",
      );
      return;
    }

    if (!selectedItemId) {
      setFormError(
        "Please select an item.",
      );
      return;
    }

    const trimmedLot =
      lotNumber.trim();

    if (!trimmedLot) {
      setFormError(
        "Lot number is required.",
      );
      return;
    }

    if (duplicateLotNumber) {
      setFormError(
        "A batch with this lot number already exists for this item.",
      );
      return;
    }

    try {
      setCreating(true);

      const created =
        await createBatch(
          user.organization_id,
          selectedItemId,
          {
            lot_number: trimmedLot,
            expiry_date:
              expiryDate || null,
          },
        );

      setBatches((current) => [
        ...current,
        created,
      ]);

      setShowCreateModal(false);

      setLotNumber("");
      setExpiryDate("");

      setSuccess(
        `Batch "${created.lot_number}" was created successfully.`,
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to create batch.";

      if (
        message
          .toLowerCase()
          .includes("already exists")
      ) {
        setFormError(
          "A batch with this lot number already exists for this item.",
        );
      } else {
        setFormError(message);
      }
    } finally {
      setCreating(false);
    }
  }


  async function handleArchive(
    batch: Batch,
  ) {
    if (!user) {
      return;
    }

    const confirmed =
      window.confirm(
        `Archive batch "${batch.lot_number}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setArchivingBatchId(batch.id);
      setError(null);
      setSuccess(null);

      const result =
        await archiveBatch(
          user.organization_id,
          batch.item_id,
          batch.id,
        );

      setBatches((current) =>
        current.map((currentBatch) =>
          currentBatch.id === result.id
            ? {
                ...currentBatch,
                is_archived:
                  result.is_archived,
              }
            : currentBatch,
        ),
      );

      setSuccess(
        `Batch "${result.lot_number}" was archived successfully.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to archive batch.",
      );
    } finally {
      setArchivingBatchId(null);
    }
  }


  return (
    <div className="min-h-full bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400">
                <ClipboardList className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold text-white">
                  Batches
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  Manage inventory lots, expiry dates,
                  and batch lifecycle.
                </p>
              </div>

            </div>
          </div>

          {user?.role === "admin" &&
            selectedItemId && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                Add Batch
              </button>
            )}
        </div>


        {/* Success */}

        {success && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">

            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              {success}
            </div>

            <button
              type="button"
              onClick={() =>
                setSuccess(null)
              }
              className="text-emerald-400 hover:text-emerald-200"
            >
              <X className="h-4 w-4" />
            </button>

          </div>
        )}


        {/* Error */}

        {error && !showCreateModal && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">

            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              {error}
            </div>

            <button
              type="button"
              onClick={() =>
                setError(null)
              }
              className="text-red-400 hover:text-red-200"
            >
              <X className="h-4 w-4" />
            </button>

          </div>
        )}


        {/* Item selector */}

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex flex-col gap-4 md:flex-row md:items-end">

            <div className="flex-1">
              <label
                htmlFor="item-select"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Item
              </label>

              <select
                id="item-select"
                value={selectedItemId}
                onChange={(event) =>
                  setSelectedItemId(
                    event.target.value,
                  )
                }
                disabled={loadingItems}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                {items.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name} — {item.sku}
                  </option>
                ))}
              </select>
            </div>

            {selectedItem && (
              <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">

                <div className="flex items-center gap-3">

                  <Package className="h-4 w-4 text-blue-400" />

                  <div>
                    <div className="text-sm font-medium text-white">
                      {selectedItem.name}
                    </div>

                    <div className="text-xs text-slate-500">
                      {selectedItem.unit}
                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>
        </div>


        {/* Batch table */}

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

            <div>
              <h2 className="text-sm font-semibold text-white">
                Batches
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {batches.length}{" "}
                {batches.length === 1
                  ? "batch"
                  : "batches"}
              </p>
            </div>

            {selectedItemId && (
              <button
                type="button"
                onClick={() =>
                  loadBatches(
                    selectedItemId,
                  )
                }
                disabled={
                  loadingBatches
                }
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    loadingBatches
                      ? "animate-spin"
                      : ""
                  }`}
                />
                Refresh
              </button>
            )}

          </div>


          {loadingItems ||
          loadingBatches ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading batches...
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">

              <Package className="h-10 w-10 text-slate-600" />

              <h3 className="mt-4 text-sm font-semibold text-white">
                No items available
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Create an item before creating a batch.
              </p>

            </div>
          ) : batches.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">

              <ClipboardList className="h-10 w-10 text-slate-600" />

              <h3 className="mt-4 text-sm font-semibold text-white">
                No batches for this item
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Create a batch to start tracking
                lots and expiry dates.
              </p>

              {user?.role === "admin" && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  <Plus className="h-4 w-4" />
                  Add Batch
                </button>
              )}

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[800px]">

                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">

                    <th className="px-5 py-3 font-medium">
                      Lot Number
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Expiry
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Status
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Received
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Action
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {batches.map(
                    (batch) => {
                      const expiryStatus =
                        getExpiryStatus(
                          batch.expiry_date,
                        );

                      return (
                        <tr
                          key={batch.id}
                          className={`border-b border-slate-800/70 last:border-b-0 ${
                            batch.is_archived
                              ? "opacity-50"
                              : "hover:bg-slate-800/30"
                          }`}
                        >

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-3">

                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400">
                                <ClipboardList className="h-4 w-4" />
                              </div>

                              <div>
                                <div className="text-sm font-medium text-white">
                                  {batch.lot_number}
                                </div>

                                <div className="text-xs text-slate-500">
                                  Batch / lot
                                </div>
                              </div>

                            </div>

                          </td>


                          <td className="px-5 py-4">

                            <div className="flex items-center gap-2 text-sm text-slate-300">

                              <CalendarDays className="h-4 w-4 text-slate-500" />

                              {formatDate(
                                batch.expiry_date,
                              )}

                            </div>

                          </td>


                          <td className="px-5 py-4">

                            {batch.is_archived ? (
                              <span className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400">
                                Archived
                              </span>
                            ) : (
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${expiryStatus.className}`}
                              >
                                {expiryStatus.label}
                              </span>
                            )}

                          </td>


                          <td className="px-5 py-4 text-sm text-slate-400">
                            {new Date(
                              batch.received_at,
                            ).toLocaleDateString()}
                          </td>


                          <td className="px-5 py-4">

                            {user?.role ===
                              "admin" &&
                            !batch.is_archived ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleArchive(
                                    batch,
                                  )
                                }
                                disabled={
                                  archivingBatchId ===
                                  batch.id
                                }
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {archivingBatchId ===
                                batch.id ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Archive className="h-3.5 w-3.5" />
                                )}

                                Archive
                              </button>
                            ) : (
                              <span className="text-xs text-slate-600">
                                —
                              </span>
                            )}

                          </td>

                        </tr>
                      );
                    },
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>


      {/* Create modal */}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

              <div>
                <h2 className="text-lg font-semibold text-white">
                  Add Batch
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {selectedItem?.name}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeCreateModal
                }
                disabled={creating}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>

            </div>


            <form
              onSubmit={
                handleCreateBatch
              }
              className="space-y-5 p-5"
            >

              {formError && (
                <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">

                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <div className="flex-1">

                    <div className="font-semibold text-red-200">
                      Cannot create batch
                    </div>

                    <div className="mt-1">
                      {formError}
                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setFormError(null)
                    }
                    className="text-red-400 hover:text-red-200"
                  >
                    <X className="h-4 w-4" />
                  </button>

                </div>
              )}


              <div>

                <label
                  htmlFor="lot-number"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Lot Number
                </label>

                <input
                  id="lot-number"
                  type="text"
                  value={lotNumber}
                  onChange={(event) => {
                    setLotNumber(
                      event.target.value,
                    );
                    setFormError(null);
                  }}
                  placeholder="e.g. LOT-A4-003"
                  autoFocus
                  className={`w-full rounded-lg border bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:ring-2 ${
                    duplicateLotNumber
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />

                {duplicateLotNumber && (
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium text-red-400">

                    <AlertCircle className="h-4 w-4" />

                    <span>
                      This lot number already exists
                      for this item.
                    </span>

                  </div>
                )}

              </div>


              <div>

                <label
                  htmlFor="expiry-date"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Expiry Date
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    Optional
                  </span>
                </label>

                <input
                  id="expiry-date"
                  type="date"
                  value={expiryDate}
                  onChange={(event) =>
                    setExpiryDate(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />

              </div>


              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">

                <button
                  type="button"
                  onClick={
                    closeCreateModal
                  }
                  disabled={creating}
                  className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    creating ||
                    duplicateLotNumber ||
                    !lotNumber.trim()
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {creating && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}

                  {creating
                    ? "Creating..."
                    : "Create Batch"}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}