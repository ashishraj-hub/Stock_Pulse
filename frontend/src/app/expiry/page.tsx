"use client";

import { useEffect, useMemo, useState } from "react";

import {
  archiveBatch,
  getBatches,
  type Batch,
} from "../lib/batches";
import { getCurrentUser, type CurrentUser } from "../lib/auth";
import {
  getInventory,
  type InventoryListItem,
} from "../lib/inventory";

type ExpiryStatus =
  | "expired"
  | "today"
  | "soon"
  | "healthy"
  | "no-expiry";

interface ExpiryRow {
  inventory: InventoryListItem;
  batch: Batch;
  status: ExpiryStatus;
  daysUntilExpiry: number | null;
}

function getToday() {
  const today = new Date();

  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function getDaysUntilExpiry(expiryDate: string | null) {
  if (!expiryDate) {
    return null;
  }

  const today = getToday();
  const expiry = parseDateOnly(expiryDate);

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.round(
    (expiry.getTime() - today.getTime()) / millisecondsPerDay,
  );
}

function getExpiryStatus(
  expiryDate: string | null,
): ExpiryStatus {
  const days = getDaysUntilExpiry(expiryDate);

  if (days === null) {
    return "no-expiry";
  }

  if (days < 0) {
    return "expired";
  }

  if (days === 0) {
    return "today";
  }

  if (days <= 7) {
    return "soon";
  }

  return "healthy";
}

function formatExpiryDate(value: string | null) {
  if (!value) {
    return "No expiry";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseDateOnly(value));
}

function statusLabel(status: ExpiryStatus) {
  switch (status) {
    case "expired":
      return "Expired";
    case "today":
      return "Expires today";
    case "soon":
      return "Expiring soon";
    case "healthy":
      return "Healthy";
    case "no-expiry":
      return "No expiry";
  }
}

function statusClasses(status: ExpiryStatus) {
  switch (status) {
    case "expired":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "today":
      return "border-orange-500/30 bg-orange-500/10 text-orange-300";
    case "soon":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    case "healthy":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "no-expiry":
      return "border-slate-500/30 bg-slate-500/10 text-slate-300";
  }
}

function daysLabel(days: number | null) {
  if (days === null) {
    return "—";
  }

  if (days < 0) {
    const absoluteDays = Math.abs(days);

    return `${absoluteDays} day${absoluteDays === 1 ? "" : "s"} overdue`;
  }

  if (days === 0) {
    return "Today";
  }

  return `${days} day${days === 1 ? "" : "s"} left`;
}

export default function ExpiryPage() {
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [rows, setRows] = useState<ExpiryRow[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | ExpiryStatus>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const user = await getCurrentUser();

      setCurrentUser(user);

      const inventory = await getInventory(
        user.organization_id,
      );

      const uniqueItemIds = Array.from(
        new Set(inventory.map((item) => item.item_id)),
      );

      const batchResults = await Promise.all(
        uniqueItemIds.map(async (itemId) => {
          return getBatches(
            user.organization_id,
            itemId,
          );
        }),
      );

      const batches = batchResults.flat();

      const batchMap = new Map<string, Batch>();

      for (const batch of batches) {
        batchMap.set(batch.id, batch);
      }

      const expiryRows: ExpiryRow[] = inventory
        .filter((inventoryItem) => {
          return inventoryItem.available_quantity > 0;
        })
        .map((inventoryItem) => {
          const batch = batchMap.get(
            inventoryItem.batch_id,
          );

          if (!batch) {
            return null;
          }

          const status = getExpiryStatus(
            batch.expiry_date,
          );

          return {
            inventory: inventoryItem,
            batch,
            status,
            daysUntilExpiry: getDaysUntilExpiry(
              batch.expiry_date,
            ),
          };
        })
        .filter(
          (row): row is ExpiryRow => row !== null,
        );

      setRows(expiryRows);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load expiry information",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return rows
      .filter((row) => {
        if (
          statusFilter !== "all" &&
          row.status !== statusFilter
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const searchableText = [
          row.inventory.sku,
          row.inventory.item_name,
          row.inventory.lot_number,
          row.inventory.location_name,
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(
          normalizedSearch,
        );
      })
      .sort((a, b) => {
        const aDays =
          a.daysUntilExpiry ?? Number.MAX_SAFE_INTEGER;

        const bDays =
          b.daysUntilExpiry ?? Number.MAX_SAFE_INTEGER;

        return aDays - bDays;
      });
  }, [rows, search, statusFilter]);

  const metrics = useMemo(() => {
    return {
      expired: rows.filter(
        (row) => row.status === "expired",
      ).length,

      today: rows.filter(
        (row) => row.status === "today",
      ).length,

      soon: rows.filter(
        (row) => row.status === "soon",
      ).length,

      healthy: rows.filter(
        (row) =>
          row.status === "healthy" ||
          row.status === "no-expiry",
      ).length,
    };
  }, [rows]);

  async function handleArchive(row: ExpiryRow) {
    if (!currentUser) {
      return;
    }

    const confirmed = window.confirm(
      `Archive batch ${row.batch.lot_number}? This can only be done when no available stock remains.`,
    );

    if (!confirmed) {
      return;
    }

    setArchiveId(row.batch.id);
    setActionError("");

    try {
      await archiveBatch(
        currentUser.organization_id,
        row.batch.item_id,
        row.batch.id,
      );

      await loadData();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to archive batch",
      );
    } finally {
      setArchiveId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.8)]" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                  Inventory Intelligence
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white">
                Expiry Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Monitor batch expiry dates, identify at-risk
                inventory, and manage expired stock safely.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {/* Errors */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <span className="font-semibold">
              Error:
            </span>{" "}
            {error}
          </div>
        )}

        {actionError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <span className="font-semibold">
              Action failed:
            </span>{" "}
            {actionError}
          </div>
        )}

        {/* Metrics */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Expired"
            value={metrics.expired}
            description="Stock past expiry"
            accent="red"
          />

          <MetricCard
            label="Expires today"
            value={metrics.today}
            description="Needs immediate attention"
            accent="orange"
          />

          <MetricCard
            label="Expiring soon"
            value={metrics.soon}
            description="Within 7 days"
            accent="yellow"
          />

          <MetricCard
            label="Healthy / no expiry"
            value={metrics.healthy}
            description="More than 7 days or no date"
            accent="green"
          />
        </section>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-white">
              Expiry filters
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Search inventory or filter by expiry risk.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search SKU, item, lot, or location..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 md:flex-1"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "all"
                    | ExpiryStatus,
                )
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10"
            >
              <option value="all">
                All statuses
              </option>

              <option value="expired">
                Expired
              </option>

              <option value="today">
                Expires today
              </option>

              <option value="soon">
                Expiring soon
              </option>

              <option value="healthy">
                Healthy
              </option>

              <option value="no-expiry">
                No expiry
              </option>
            </select>
          </div>
        </section>

        {/* Inventory Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
          <div className="border-b border-slate-800 px-5 py-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-semibold text-white">
                  Expiry inventory
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Inventory is sorted by nearest expiry.
                </p>
              </div>

              <div className="text-sm text-slate-400">
                <span className="font-semibold text-slate-200">
                  {filteredRows.length}
                </span>{" "}
                stock lot
                {filteredRows.length === 1
                  ? ""
                  : "s"} displayed
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-orange-400" />

              <p className="text-sm text-slate-400">
                Loading expiry information...
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xl">
                ✓
              </div>

              <h3 className="font-semibold text-white">
                No matching expiry records
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or status filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4">
                      Item
                    </th>

                    <th className="px-5 py-4">
                      Lot
                    </th>

                    <th className="px-5 py-4">
                      Location
                    </th>

                    <th className="px-5 py-4">
                      Available
                    </th>

                    <th className="px-5 py-4">
                      Expiry
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    {currentUser?.role ===
                      "admin" && (
                      <th className="px-5 py-4">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {filteredRows.map((row) => (
                    <tr
                      key={`${row.inventory.inventory_lot_id}-${row.batch.id}`}
                      className="transition hover:bg-slate-800/50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">
                          {row.inventory.item_name}
                        </div>

                        <div className="mt-1 font-mono text-xs text-slate-500">
                          {row.inventory.sku}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-slate-300">
                        {row.batch.lot_number}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {row.inventory.location_name}
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-semibold text-white">
                          {row.inventory.available_quantity}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-200">
                          {formatExpiryDate(
                            row.batch.expiry_date,
                          )}
                        </div>

                        <div
                          className={`mt-1 text-xs ${
                            row.status === "expired"
                              ? "text-red-400"
                              : row.status === "today"
                                ? "text-orange-400"
                                : row.status === "soon"
                                  ? "text-yellow-400"
                                  : "text-slate-500"
                          }`}
                        >
                          {daysLabel(
                            row.daysUntilExpiry,
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                            row.status,
                          )}`}
                        >
                          {statusLabel(row.status)}
                        </span>
                      </td>

                      {currentUser?.role ===
                        "admin" && (
                        <td className="px-5 py-4">
                          {row.batch.is_archived ? (
                            <span className="text-xs font-medium text-slate-500">
                              Archived
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                void handleArchive(
                                  row,
                                )
                              }
                              disabled={
                                archiveId ===
                                row.batch.id
                              }
                              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-orange-500/50 hover:bg-slate-700 hover:text-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {archiveId ===
                              row.batch.id
                                ? "Archiving..."
                                : "Archive"}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* FEFO note */}
        <section className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-300">
              FEFO
            </div>

            <div>
              <h3 className="font-semibold text-orange-200">
                FEFO-aware inventory
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                Stock with the nearest expiry should be
                consumed first. Use the Stock Operations
                FEFO issue workflow to automatically select
                the appropriate batch.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  description,
  accent,
}: {
  label: string;
  value: number;
  description: string;
  accent: "red" | "orange" | "yellow" | "green";
}) {
  const accentClasses = {
    red: "border-red-500/20 bg-red-500/5 text-red-300",
    orange:
      "border-orange-500/20 bg-orange-500/5 text-orange-300",
    yellow:
      "border-yellow-500/20 bg-yellow-500/5 text-yellow-300",
    green:
      "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
  };

  return (
    <div
      className={`rounded-2xl border bg-slate-900 p-5 shadow-xl ${accentClasses[accent]}`}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">
          {label}
        </div>

        <div className="h-2 w-2 rounded-full bg-current opacity-80" />
      </div>

      <div className="mt-3 text-3xl font-bold text-white">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {description}
      </div>
    </div>
  );
}