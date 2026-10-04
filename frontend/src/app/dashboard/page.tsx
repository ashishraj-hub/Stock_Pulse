"use client";

import { useEffect, useState } from "react";

import {
  getCurrentUser,
  type CurrentUser,
} from "../lib/auth";

import {
  getDashboardSummary,
  type DashboardSummary,
} from "../lib/dashboard";

import {
  getLowStockItems,
  type LowStockItem,
} from "../lib/low-stock";

import {
  getReorderSuggestion,
  type ReorderSuggestion,
} from "../lib/reorder";

import {
  getProcurementSummary,
  type ProcurementSummary,
} from "../lib/procurement";

export default function DashboardPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);

  const [lowStockItems, setLowStockItems] =
    useState<LowStockItem[]>([]);

  const [selectedSuggestion, setSelectedSuggestion] =
    useState<ReorderSuggestion | null>(null);

  const [suggestionLoading, setSuggestionLoading] =
    useState(false);

  const [suggestionError, setSuggestionError] =
    useState("");

  const [procurement, setProcurement] =
    useState<ProcurementSummary | null>(null);

  const [procurementError, setProcurementError] =
    useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const currentUser = await getCurrentUser();

        setUser(currentUser);

        const dashboard =
          await getDashboardSummary(
            currentUser.organization_id,
          );

        setSummary(dashboard);

        const lowStock =
          await getLowStockItems(
            currentUser.organization_id,
          );

        setLowStockItems(lowStock);

        try {
          const procurementSummary =
            await getProcurementSummary(
              currentUser.organization_id,
            );

          setProcurement(procurementSummary);
        } catch (err) {
          setProcurementError(
            err instanceof Error
              ? err.message
              : "Failed to load procurement summary",
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard",
        );
      }
    }

    loadDashboard();
  }, []);

  async function handleReorderSuggestion(
    itemId: string,
  ) {
    try {
      setSuggestionLoading(true);
      setSuggestionError("");
      setSelectedSuggestion(null);

      if (!user) {
        throw new Error("User session not available");
      }

      const suggestion =
        await getReorderSuggestion(
          user.organization_id,
          itemId,
        );

      setSelectedSuggestion(suggestion);
    } catch (err) {
      setSuggestionError(
        err instanceof Error
          ? err.message
          : "Failed to load reorder suggestion",
      );
    } finally {
      setSuggestionLoading(false);
    }
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold">
          StockPulse
        </h1>

        <p className="mt-4 text-red-600">
          {error}
        </p>
      </main>
    );
  }

  if (!user || !summary) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            StockPulse
          </h1>

          <p className="mt-2 text-gray-600">
            Welcome, {user.name}
          </p>

          <p className="text-sm text-gray-500">
            Role: {user.role}
          </p>
        </div>

        {/* Dashboard summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <DashboardCard
            title="Total Items"
            value={summary.total_items}
          />

          <DashboardCard
            title="Available Units"
            value={summary.total_available_units}
          />

          <DashboardCard
            title="Low Stock"
            value={summary.low_stock_count}
          />

          <DashboardCard
            title="Out of Stock"
            value={summary.out_of_stock_count}
          />

          <DashboardCard
            title="Pending Reorders"
            value={summary.pending_reorder_count}
          />
        </div>

        {/* Procurement Summary */}
        <div className="mt-8">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">
              Procurement Summary
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Current purchase order status across your organization.
            </p>
          </div>

          {procurementError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">
                {procurementError}
              </p>
            </div>
          ) : !procurement ? (
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">
                Loading procurement summary...
              </p>
            </div>
          ) : (
            <>
              {/* Total purchase orders */}
              <div className="mb-4">
                <div className="rounded-xl border bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">
                    Total Purchase Orders
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {procurement.total}
                  </p>
                </div>
              </div>

              {/* Procurement status cards */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">

                <ProcurementCard
                  title="Draft"
                  value={procurement.draft}
                />

                <ProcurementCard
                  title="Pending Approval"
                  value={procurement.pending_approval}
                />

                <ProcurementCard
                  title="Approved"
                  value={procurement.approved}
                />

                <ProcurementCard
                  title="Ordered"
                  value={procurement.ordered}
                />

                <ProcurementCard
                  title="Received"
                  value={procurement.received}
                />

                <ProcurementCard
                  title="Cancelled"
                  value={procurement.cancelled}
                />

              </div>
            </>
          )}
        </div>

        {/* Low stock items */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold">
            Low Stock Items
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Items that have reached or fallen below
            their reorder point.
          </p>

          {lowStockItems.length === 0 ? (
            <p className="mt-4 text-gray-500">
              No low-stock items.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      Item
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      SKU
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Available
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Reorder Point
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Shortage
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Configured Order
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {lowStockItems.map((item) => (
                    <tr
                      key={item.item_id}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium">
                        {item.name}
                      </td>

                      <td className="px-4 py-3">
                        {item.sku}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={
                            item.available_quantity === 0
                              ? "font-semibold text-red-600"
                              : "font-semibold text-amber-600"
                          }
                        >
                          {item.available_quantity}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {item.reorder_point}
                      </td>

                      <td className="px-4 py-3">
                        {item.shortage_quantity}
                      </td>

                      <td className="px-4 py-3">
                        {item.reorder_quantity}
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleReorderSuggestion(
                              item.item_id,
                            )
                          }
                          disabled={suggestionLoading}
                          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {suggestionLoading
                            ? "Loading..."
                            : "Get Suggestion"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reorder suggestion error */}
        {suggestionError && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {suggestionError}
            </p>
          </div>
        )}

        {/* Reorder suggestion */}
        {selectedSuggestion && (
          <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  Reorder Suggestion
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  Backend-generated reorder recommendation
                  for{" "}
                  <span className="font-semibold">
                    {selectedSuggestion.name}
                  </span>
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedSuggestion(null)
                }
                className="text-sm font-medium text-gray-500 hover:text-gray-800"
              >
                Close
              </button>
            </div>

            {/* Suggestion details */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

              <SuggestionCard
                label="SKU"
                value={selectedSuggestion.sku}
              />

              <SuggestionCard
                label="Available"
                value={
                  selectedSuggestion.available_quantity
                }
              />

              <SuggestionCard
                label="Reorder Point"
                value={
                  selectedSuggestion.reorder_point
                }
              />

              <SuggestionCard
                label="Suggested Quantity"
                value={
                  selectedSuggestion.suggested_quantity
                }
                highlight
              />

              <SuggestionCard
                label="Lead Time"
                value={`${selectedSuggestion.lead_time_days} days`}
              />

            </div>

            {/* Recommendation message */}
            <div className="mt-6 rounded-lg border border-blue-200 bg-white p-4">
              <p className="text-sm text-gray-500">
                Recommendation
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {selectedSuggestion.is_low_stock
                  ? `Reorder ${selectedSuggestion.suggested_quantity} units.`
                  : "No reorder is currently required."}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

interface DashboardCardProps {
  title: string;
  value: number;
}

function DashboardCard({
  title,
  value,
}: DashboardCardProps) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}

interface ProcurementCardProps {
  title: string;
  value: number;
}

function ProcurementCard({
  title,
  value,
}: ProcurementCardProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

interface SuggestionCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

function SuggestionCard({
  label,
  value,
  highlight = false,
}: SuggestionCardProps) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p
        className={
          highlight
            ? "mt-2 text-2xl font-bold text-blue-700"
            : "mt-2 text-xl font-bold text-gray-900"
        }
      >
        {value}
      </p>
    </div>
  );
}