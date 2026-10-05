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
      return "bg-red-100 text-red-700";
    case "today":
      return "bg-orange-100 text-orange-700";
    case "soon":
      return "bg-yellow-100 text-yellow-700";
    case "healthy":
      return "bg-green-100 text-green-700";
    case "no-expiry":
      return "bg-gray-100 text-gray-700";
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
          const batches = await getBatches(
            user.organization_id,
            itemId,
          );

          return batches;
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
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Expiry Management
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Monitor batch expiry dates and identify stock
            that needs attention.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {actionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {actionError}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Expired"
            value={metrics.expired}
            description="Stock past expiry"
          />

          <MetricCard
            label="Expires today"
            value={metrics.today}
            description="Needs immediate attention"
          />

          <MetricCard
            label="Expiring soon"
            value={metrics.soon}
            description="Within 7 days"
          />

          <MetricCard
            label="Healthy / no expiry"
            value={metrics.healthy}
            description="More than 7 days or no date"
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search SKU, item, lot, or location..."
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500 md:flex-1"
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
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="all">All statuses</option>
              <option value="expired">Expired</option>
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

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Expiry inventory
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredRows.length} stock lot
              {filteredRows.length === 1 ? "" : "s"}
              displayed
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading expiry information...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No matching expiry records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      Item
                    </th>

                    <th className="px-5 py-3">
                      Lot
                    </th>

                    <th className="px-5 py-3">
                      Location
                    </th>

                    <th className="px-5 py-3">
                      Available
                    </th>

                    <th className="px-5 py-3">
                      Expiry
                    </th>

                    <th className="px-5 py-3">
                      Status
                    </th>

                    {currentUser?.role ===
                      "admin" && (
                      <th className="px-5 py-3">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr
                      key={`${row.inventory.inventory_lot_id}-${row.batch.id}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {row.inventory.item_name}
                        </div>

                        <div className="text-xs text-slate-500">
                          {row.inventory.sku}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-slate-700">
                        {row.batch.lot_number}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {row.inventory.location_name}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-900">
                        {row.inventory.available_quantity}
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-slate-900">
                          {formatExpiryDate(
                            row.batch.expiry_date,
                          )}
                        </div>

                        <div className="text-xs text-slate-500">
                          {daysLabel(
                            row.daysUntilExpiry,
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(
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
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {description}
      </div>
    </div>
  );
}