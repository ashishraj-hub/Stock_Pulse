
"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  Barcode,
  CheckCircle2,
  Clock3,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
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

const initialForm: CreateItemRequest = {
  sku: "",
  name: "",
  barcode: "",
  unit: "pcs",
  reorder_point: 0,
  reorder_quantity: 0,
  lead_time_days: 0,
};

export default function ItemsPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<CreateItemRequest>(initialForm);

  const canCreateItems = user?.role === "admin";

  const loadItems = useCallback(async () => {
    try {
      setError(null);

      const currentUser = user ?? (await getCurrentUser());

      if (!user) {
        setUser(currentUser);
      }

      const itemList = await getItems(currentUser.organization_id);
      setItems(itemList);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load items.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return items;

    return items.filter((item) =>
      [
        item.name,
        item.sku,
        item.barcode,
        item.unit,
        item.id,
      ].some((value) => String(value ?? "").toLowerCase().includes(query)),
    );
  }, [items, search]);

  const barcodedCount = useMemo(
    () => items.filter((item) => Boolean(item.barcode)).length,
    [items],
  );

  const reorderConfiguredCount = useMemo(
    () =>
      items.filter(
        (item) => item.reorder_point > 0 || item.reorder_quantity > 0,
      ).length,
    [items],
  );

  const updateForm = (
    field: keyof CreateItemRequest,
    value: string | number | null,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === "sku") {
      setFormError(null);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setFormError(null);
  };

  const isDuplicateSku = (sku: string) => {
    const normalizedSku = sku.trim().toLowerCase();

    if (!normalizedSku) return false;

    return items.some(
      (item) => item.sku.trim().toLowerCase() === normalizedSku,
    );
  };

  const duplicateSku = Boolean(form.sku?.trim()) && isDuplicateSku(form.sku ?? "");

  const openCreateForm = () => {
    if (!canCreateItems) return;

    setShowCreateForm(true);
    setFormError(null);
    setError(null);
    setSuccess(null);
  };

  const closeCreateForm = () => {
    if (creating) return;

    setShowCreateForm(false);
    setFormError(null);
    setError(null);
  };

  const handleCreateItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormError(null);
    setError(null);

    if (!user) {
      setFormError("Authenticated user information is not available.");
      return;
    }

    if (user.role !== "admin") {
      setShowCreateForm(false);
      setError("Only administrators can create items.");
      return;
    }

    if (!form.sku?.trim()) {
      setFormError("SKU is required.");
      return;
    }

    if (isDuplicateSku(form.sku)) {
      setFormError("An item with this SKU already exists.");
      return;
    }

    if (!form.name?.trim()) {
      setFormError("Item name is required.");
      return;
    }

    if (!form.unit?.trim()) {
      setFormError("Unit is required.");
      return;
    }

    try {
      setCreating(true);

      const createdItem = await createItem(user.organization_id, {
        sku: form.sku.trim(),
        name: form.name.trim(),
        barcode: form.barcode?.trim() || null,
        unit: form.unit.trim(),
        reorder_point: Number(form.reorder_point ?? 0),
        reorder_quantity: Number(form.reorder_quantity ?? 0),
        lead_time_days: Number(form.lead_time_days ?? 0),
      });

      setItems((current) => [...current, createdItem]);
      resetForm();
      setShowCreateForm(false);
      setSuccess(`Item "${createdItem.name}" was created successfully.`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create item.";

      if (
        message.toLowerCase().includes("sku") &&
        message.toLowerCase().includes("already exists")
      ) {
        setFormError("An item with this SKU already exists.");
      } else {
        setFormError(message);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setSuccess(null);
    await loadItems();
  };

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-6 lg:px-8">
        {/* Page header */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/15 via-slate-900/80 to-violet-500/10 p-6 shadow-2xl shadow-blue-950/20 sm:p-8">
          <div className="soft-grid pointer-events-none absolute inset-0 opacity-20" />
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-medium text-blue-300">
                <Package className="h-3.5 w-3.5" />
                PRODUCT MANAGEMENT
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Item <span className="gradient-text">Catalog</span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                Manage products, SKUs, barcodes, and intelligent reorder
                settings in one place.
              </p>

              {user && (
                <div className="mt-4 inline-flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Signed in as{" "}
                  <span className="font-semibold text-slate-300">
                    {user.role}
                  </span>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="glass-panel inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-blue-400/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              {canCreateItems && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:-translate-y-0.5 hover:from-blue-500 hover:to-indigo-500"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Messages */}
        {error && !showCreateForm && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="rounded-lg p-1 text-red-300 transition hover:bg-red-400/10 hover:text-white"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {success}
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="ml-auto rounded-lg p-1 transition hover:bg-emerald-400/10"
              aria-label="Dismiss success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Summary cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            icon={<Package className="h-5 w-5" />}
            label="Total Items"
            value={loading ? "—" : items.length.toLocaleString()}
            detail="Products in your catalog"
            accent="blue"
          />

          <SummaryCard
            icon={<Barcode className="h-5 w-5" />}
            label="Barcoded Items"
            value={loading ? "—" : barcodedCount.toLocaleString()}
            detail="Items with scanner-ready codes"
            accent="violet"
          />

          <SummaryCard
            icon={<Settings2 className="h-5 w-5" />}
            label="Reorder Configured"
            value={loading ? "—" : reorderConfiguredCount.toLocaleString()}
            detail="Items with reorder settings"
            accent="emerald"
          />
        </section>

        {/* Catalog */}
        <section className="glass-panel overflow-hidden rounded-3xl">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">
                  Item Catalog
                </h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                  {loading ? "…" : filteredItems.length}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Products available in your organization.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, SKU, barcode..."
                aria-label="Search items"
                className="w-full rounded-xl border border-white/10 bg-slate-950/50 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 px-5 py-16 text-center">
              <RefreshCw className="h-7 w-7 animate-spin text-blue-400" />
              <p className="text-sm text-slate-400">Loading item catalog...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10">
                <Package className="h-8 w-8 text-blue-300" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-white">
                No items yet
              </h3>
              <p className="mt-2 max-w-sm text-sm text-slate-400">
                Your catalog is currently empty. Add your first inventory item
                to get started.
              </p>
              {canCreateItems && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  <Plus className="h-4 w-4" />
                  Add First Item
                </button>
              )}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Search className="mx-auto h-8 w-8 text-slate-600" />
              <h3 className="mt-4 text-sm font-semibold text-white">
                No matching items
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Try another name, SKU, barcode, or item ID.
              </p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 text-sm font-medium text-blue-300 hover:text-blue-200"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[850px] w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-950/30">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Item
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      SKU
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Barcode
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Unit
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Reorder Point
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Reorder Qty
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Lead Time
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.06]">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="group transition hover:bg-blue-400/[0.04]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-blue-300 transition group-hover:border-blue-400/30 group-hover:bg-blue-500/15">
                            <Package className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-xs truncate text-sm font-semibold text-white">
                              {item.name}
                            </p>
                            <p className="mt-1 max-w-xs truncate font-mono text-[10px] text-slate-500">
                              ID: {item.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-xs text-slate-300">
                          {item.sku}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-400">
                        {item.barcode ? (
                          <span className="inline-flex items-center gap-2">
                            <Barcode className="h-4 w-4 text-violet-400" />
                            {item.barcode}
                          </span>
                        ) : (
                          <span className="text-slate-600">Not assigned</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-slate-300">
                          {item.unit}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm tabular-nums text-slate-300">
                        {item.reorder_point.toLocaleString()}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm tabular-nums text-slate-300">
                        {item.reorder_quantity.toLocaleString()}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <span className="inline-flex items-center justify-end gap-1.5 text-sm tabular-nums text-slate-300">
                          <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                          {item.lead_time_days} days
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-white/[0.06] px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span>
                Showing {filteredItems.length} of {items.length} items
              </span>
              <span>Catalog data for your organization</span>
            </div>
          )}
        </section>
      </div>

      {/* Create Item Modal */}
      {showCreateForm && canCreateItems && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-md sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateForm();
            }
          }}
        >
          <div className="relative my-auto max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-900/95 px-5 py-5 backdrop-blur-xl sm:px-7">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-blue-300">
                  <Plus className="h-4 w-4" />
                  NEW CATALOG ENTRY
                </div>
                <h2 className="mt-2 text-xl font-bold text-white">
                  Add New Item
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Enter product information and reorder settings.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateForm}
                disabled={creating}
                aria-label="Close create item form"
                className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="relative space-y-7 p-5 sm:p-7">
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-200">
                      Cannot create item
                    </p>
                    <p className="mt-1">{formError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormError(null)}
                    className="text-red-300 hover:text-white"
                    aria-label="Dismiss form error"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Basic information */}
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Basic Information
                    </h3>
                    <p className="text-xs text-slate-500">
                      Identify the product in your catalog.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="SKU" required>
                    <input
                      value={form.sku ?? ""}
                      onChange={(event) => updateForm("sku", event.target.value)}
                      placeholder="PAPER-A4-500"
                      required
                      className={`form-input-glass ${duplicateSku ? "border-red-400/60" : ""}`}
                    />
                    {duplicateSku && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        This SKU already exists.
                      </p>
                    )}
                  </FormField>

                  <FormField label="Item Name" required>
                    <input
                      value={form.name ?? ""}
                      onChange={(event) => updateForm("name", event.target.value)}
                      placeholder="A4 Printer Paper"
                      required
                      className="form-input-glass"
                    />
                  </FormField>

                  <FormField label="Barcode" hint="Optional. Used by the scanner.">
                    <input
                      value={form.barcode ?? ""}
                      onChange={(event) =>
                        updateForm("barcode", event.target.value)
                      }
                      placeholder="8901234567890"
                      className="form-input-glass"
                    />
                  </FormField>

                  <FormField label="Unit" required hint="For example: pcs, kg, box.">
                    <input
                      value={form.unit ?? ""}
                      onChange={(event) => updateForm("unit", event.target.value)}
                      placeholder="pcs"
                      required
                      className="form-input-glass"
                    />
                  </FormField>
                </div>
              </section>

              {/* Reorder settings */}
              <section className="border-t border-white/10 pt-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
                    <Settings2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Reorder Settings
                    </h3>
                    <p className="text-xs text-slate-500">
                      These values power low-stock alerts and reorder suggestions.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <FormField label="Reorder Point" hint="Minimum stock level.">
                    <input
                      type="number"
                      min="0"
                      value={form.reorder_point ?? 0}
                      onChange={(event) =>
                        updateForm("reorder_point", Number(event.target.value))
                      }
                      className="form-input-glass"
                    />
                  </FormField>

                  <FormField label="Reorder Quantity" hint="Suggested order amount.">
                    <input
                      type="number"
                      min="0"
                      value={form.reorder_quantity ?? 0}
                      onChange={(event) =>
                        updateForm("reorder_quantity", Number(event.target.value))
                      }
                      className="form-input-glass"
                    />
                  </FormField>

                  <FormField label="Lead Time" hint="Expected supplier delivery.">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={form.lead_time_days ?? 0}
                        onChange={(event) =>
                          updateForm("lead_time_days", Number(event.target.value))
                        }
                        className="form-input-glass pr-14"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                        days
                      </span>
                    </div>
                  </FormField>
                </div>
              </section>

              {/* Modal actions */}
              <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  disabled={creating}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating || duplicateSku}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create Item
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  accent: "blue" | "violet" | "emerald";
}) {
  const accents = {
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-300",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-300",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  };

  return (
    <div className="glass-panel group relative overflow-hidden rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:border-white/20">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/[0.025] blur-2xl transition group-hover:bg-white/[0.06]" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </div>
        <div className={`rounded-xl border p-3 ${accents[accent]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  required = false,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="ml-1 text-blue-300">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
