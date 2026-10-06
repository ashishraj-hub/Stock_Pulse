"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  Package,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";

import {
  createItem,
  getItems,
  type CreateItemRequest,
  type Item,
} from "../lib/items";
import {
  getCurrentUser,
  type CurrentUser,
} from "../lib/auth";

export default function ItemsPage() {
  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [items, setItems] =
    useState<Item[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<CreateItemRequest>({
      sku: "",
      name: "",
      barcode: "",
      unit: "pcs",
      reorder_point: 0,
      reorder_quantity: 0,
      lead_time_days: 0,
    });

  /*
   * Only ADMIN users can create items.
   *
   * STAFF and VIEWER can still view the item
   * catalog, but they must not see or access
   * the item creation UI.
   */
  const canCreateItems =
    user?.role === "admin";

  async function loadItems() {
    try {
      setError(null);

      const currentUser =
        user ??
        (await getCurrentUser());

      if (!user) {
        setUser(currentUser);
      }

      const itemList =
        await getItems(
          currentUser.organization_id,
        );

      setItems(itemList);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load items.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  function updateForm(
    field: keyof CreateItemRequest,
    value: string | number | null,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === "sku") {
      setFormError(null);
    }
  }

  function resetForm() {
    setForm({
      sku: "",
      name: "",
      barcode: "",
      unit: "pcs",
      reorder_point: 0,
      reorder_quantity: 0,
      lead_time_days: 0,
    });

    setFormError(null);
  }

  function isDuplicateSku(
    sku: string,
  ): boolean {
    const normalizedSku =
      sku.trim().toLowerCase();

    if (!normalizedSku) {
      return false;
    }

    return items.some(
      (item) =>
        item.sku
          .trim()
          .toLowerCase() ===
        normalizedSku,
    );
  }

  async function handleCreateItem(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFormError(null);
    setError(null);

    /*
     * Frontend RBAC guard.
     *
     * This prevents STAFF/VIEWER from creating
     * an item even if they somehow trigger the
     * form manually.
     */
    if (!user) {
      setFormError(
        "Authenticated user information is not available.",
      );
      return;
    }

    if (user.role !== "admin") {
      setShowCreateForm(false);
      setFormError(null);

      setError(
        "Only administrators can create items.",
      );

      return;
    }

    if (!form.sku?.trim()) {
      setFormError("SKU is required.");
      return;
    }

    if (isDuplicateSku(form.sku)) {
      setFormError(
        "An item with this SKU already exists.",
      );
      return;
    }

    if (!form.name?.trim()) {
      setFormError(
        "Item name is required.",
      );
      return;
    }

    if (!form.unit?.trim()) {
      setFormError("Unit is required.");
      return;
    }

    try {
      setCreating(true);

      const createdItem =
        await createItem(
          user.organization_id,
          {
            sku: form.sku.trim(),
            name: form.name.trim(),
            barcode:
              form.barcode?.trim() ||
              null,
            unit: form.unit.trim(),
            reorder_point: Number(
              form.reorder_point ?? 0,
            ),
            reorder_quantity: Number(
              form.reorder_quantity ?? 0,
            ),
            lead_time_days: Number(
              form.lead_time_days ?? 0,
            ),
          },
        );

      setItems((current) => [
        ...current,
        createdItem,
      ]);

      resetForm();
      setShowCreateForm(false);

      setSuccess(
        `Item "${createdItem.name}" was created successfully.`,
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to create item.";

      if (
        message
          .toLowerCase()
          .includes("sku") &&
        message
          .toLowerCase()
          .includes("already exists")
      ) {
        setFormError(
          "An item with this SKU already exists.",
        );
      } else {
        setFormError(message);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setSuccess(null);

    await loadItems();
  }

  function openCreateForm() {
    /*
     * Extra UI guard.
     *
     * Only ADMIN can open the creation modal.
     */
    if (!canCreateItems) {
      return;
    }

    setShowCreateForm(true);
    setFormError(null);
    setError(null);
    setSuccess(null);
  }

  function closeCreateForm() {
    if (creating) {
      return;
    }

    setShowCreateForm(false);
    setFormError(null);
    setError(null);
  }

  const duplicateSku =
    Boolean(form.sku?.trim()) &&
    isDuplicateSku(
      form.sku ?? "",
    );

  return (
    <div className="min-h-full bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400">
                <Package className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold text-white">
                  Items
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  Manage products, SKUs,
                  barcodes, and reorder
                  settings.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">

            {/* Refresh is available to every role */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={
                loading ||
                refreshing
              }
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </button>

            {/* ADMIN ONLY */}
            {canCreateItems && (
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />

                Add Item
              </button>
            )}
          </div>
        </div>

        {/* Role information */}
        {user && (
          <div className="mt-4 text-xs text-slate-600">
            Signed in as{" "}
            <span className="text-slate-500">
              {user.role}
            </span>
          </div>
        )}

        {/* Page-level messages */}
        {error &&
          !showCreateForm && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <span>{error}</span>

              <button
                type="button"
                onClick={() =>
                  setError(null)
                }
                className="ml-auto text-red-400 hover:text-red-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

        {success && (
          <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {/* Summary */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-sm text-slate-400">
              Total Items
            </div>

            <div className="mt-2 text-2xl font-semibold text-white">
              {loading
                ? "—"
                : items.length}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-sm text-slate-400">
              Barcoded Items
            </div>

            <div className="mt-2 text-2xl font-semibold text-white">
              {loading
                ? "—"
                : items.filter(
                    (item) =>
                      item.barcode,
                  ).length}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-sm text-slate-400">
              Reorder Configured
            </div>

            <div className="mt-2 text-2xl font-semibold text-white">
              {loading
                ? "—"
                : items.filter(
                    (item) =>
                      item.reorder_point >
                        0 ||
                      item.reorder_quantity >
                        0,
                  ).length}
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">
              Item Catalog
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Products available in your
              organization.
            </p>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              Loading items...
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Package className="mx-auto h-10 w-10 text-slate-700" />

              <h3 className="mt-4 text-sm font-medium text-slate-300">
                No items yet
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Add your first inventory
                item to get started.
              </p>

              {/* ADMIN ONLY */}
              {canCreateItems && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                >
                  <Plus className="h-4 w-4" />

                  Add Item
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950/50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Item
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      SKU
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Barcode
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Unit
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Reorder Point
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Reorder Qty
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Lead Time
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {items.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-800/40"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="font-medium text-white">
                            {item.name}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {item.id}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-300">
                          {item.sku}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-400">
                          {item.barcode ||
                            "—"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-300">
                          {item.unit}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-300">
                          {
                            item.reorder_point
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-300">
                          {
                            item.reorder_quantity
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-300">
                          {
                            item.lead_time_days
                          }{" "}
                          days
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Item Modal */}
      {showCreateForm &&
        canCreateItems && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Add Item
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Create a new product in
                    your inventory catalog.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeCreateForm
                  }
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={
                  handleCreateItem
                }
                className="space-y-6 p-6"
              >

                {/* Form error */}
                {formError && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  >
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                    <div className="flex-1">
                      <div className="font-semibold text-red-200">
                        Cannot create item
                      </div>

                      <div className="mt-1">
                        {formError}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setFormError(
                          null,
                        )
                      }
                      className="text-red-400 hover:text-red-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Basic information */}
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Basic Information
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">

                    <div>
                      <label className="text-sm font-medium text-slate-300">
                        SKU
                      </label>

                      <input
                        value={
                          form.sku ??
                          ""
                        }
                        onChange={(
                          event,
                        ) =>
                          updateForm(
                            "sku",
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="PAPER-A4-500"
                        required
                        className={`mt-2 w-full rounded-lg border bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 ${
                          duplicateSku
                            ? "border-red-500/70"
                            : "border-slate-700"
                        }`}
                      />

                      {duplicateSku && (
                        <div className="mt-2 flex items-center gap-2 text-sm font-medium text-red-400">
                          <AlertCircle className="h-4 w-4 shrink-0" />

                          <span>
                            An item with
                            this SKU
                            already
                            exists.
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-300">
                        Item Name
                      </label>

                      <input
                        value={
                          form.name ??
                          ""
                        }
                        onChange={(
                          event,
                        ) =>
                          updateForm(
                            "name",
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="A4 Printer Paper"
                        required
                        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-300">
                        Barcode
                      </label>

                      <input
                        value={
                          form.barcode ??
                          ""
                        }
                        onChange={(
                          event,
                        ) =>
                          updateForm(
                            "barcode",
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="8901234567890"
                        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
                      />

                      <p className="mt-1 text-xs text-slate-600">
                        Optional. Used by
                        the scanner.
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-300">
                        Unit
                      </label>

                      <input
                        value={
                          form.unit ??
                          ""
                        }
                        onChange={(
                          event,
                        ) =>
                          updateForm(
                            "unit",
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="pcs"
                        required
                        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Reorder settings */}
                <div className="border-t border-slate-800 pt-6">
                  <h3 className="text-sm font-semibold text-white">
                    Reorder Settings
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    These values power
                    low-stock alerts and
                    reorder suggestions.
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-3">

                    <div>
                      <label className="text-sm font-medium text-slate-300">
                        Reorder Point
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={
                          form.reorder_point ??
                          0
                        }
                        onChange={(
                          event,
                        ) =>
                          updateForm(
                            "reorder_point",
                            Number(
                              event
                                .target
                                .value,
                            ),
                          )
                        }
                        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-300">
                        Reorder Quantity
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={
                          form.reorder_quantity ??
                          0
                        }
                        onChange={(
                          event,
                        ) =>
                          updateForm(
                            "reorder_quantity",
                            Number(
                              event
                                .target
                                .value,
                            ),
                          )
                        }
                        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-300">
                        Lead Time
                      </label>

                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={
                            form.lead_time_days ??
                            0
                          }
                          onChange={(
                            event,
                          ) =>
                            updateForm(
                              "lead_time_days",
                              Number(
                                event
                                  .target
                                  .value,
                              ),
                            )
                          }
                          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 pr-16 text-sm text-white outline-none focus:border-blue-500"
                        />

                        <span className="pointer-events-none absolute right-3 top-[17px] text-xs text-slate-600">
                          days
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-6">

                  <button
                    type="button"
                    onClick={
                      closeCreateForm
                    }
                    disabled={
                      creating
                    }
                    className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      creating ||
                      duplicateSku
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creating && (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    )}

                    {creating
                      ? "Creating..."
                      : "Create Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}