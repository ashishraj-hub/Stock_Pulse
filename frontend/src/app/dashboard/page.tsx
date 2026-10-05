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
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<ReorderSuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const [procurement, setProcurement] =
    useState<ProcurementSummary | null>(null);
  const [procurementError, setProcurementError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        const dashboard = await getDashboardSummary(
          currentUser.organization_id,
        );
        setSummary(dashboard);

        const lowStock = await getLowStockItems(
          currentUser.organization_id,
        );
        setLowStockItems(lowStock);

        try {
          const procurementSummary = await getProcurementSummary(
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

  async function handleReorderSuggestion(itemId: string) {
    try {
      setSuggestionLoading(true);
      setSuggestionError("");
      setSelectedSuggestion(null);

      if (!user) {
        throw new Error("User session not available");
      }

      const suggestion = await getReorderSuggestion(
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
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-6">
            <h1 className="text-2xl font-bold text-white">
              Dashboard
            </h1>
            <p className="mt-3 text-red-200">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user || !summary) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-5 shadow-xl">
          <p className="font-medium">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-400">
                StockPulse
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Inventory Dashboard
              </h1>

              <p className="mt-2 text-slate-300">
                Welcome back,{" "}
                <span className="font-semibold text-white">
                  {user.name}
                </span>
                .
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current role
              </p>
              <p className="mt-1 font-bold text-cyan-300">
                {user.role}
              </p>
            </div>
          </div>
        </header>

        {/* KPI cards */}
        <section aria-label="Inventory overview">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white">
              Inventory Overview
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Current inventory health across your organization.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <DashboardCard
              title="Total Items"
              value={summary.total_items}
              accent="cyan"
            />

            <DashboardCard
              title="Available Units"
              value={summary.total_available_units}
              accent="blue"
            />

            <DashboardCard
              title="Low Stock"
              value={summary.low_stock_count}
              accent="amber"
            />

            <DashboardCard
              title="Out of Stock"
              value={summary.out_of_stock_count}
              accent="red"
            />

            <DashboardCard
              title="Pending Reorders"
              value={summary.pending_reorder_count}
              accent="violet"
            />
          </div>
        </section>

        {/* Procurement */}
        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white">
              Procurement Summary
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Current purchase order status across your organization.
            </p>
          </div>

          {procurementError ? (
            <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-5">
              <p className="text-sm font-medium text-red-200">
                {procurementError}
              </p>
            </div>
          ) : !procurement ? (
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">
                Loading procurement summary...
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg">
                <p className="text-sm font-medium text-slate-400">
                  Total Purchase Orders
                </p>

                <p className="mt-2 text-4xl font-bold text-white">
                  {procurement.total}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                <ProcurementCard title="Draft" value={procurement.draft} />
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
        </section>

        {/* Low stock */}
        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-white">
              Low Stock Items
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Items that have reached or fallen below their reorder point.
            </p>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-6">
              <p className="font-semibold text-emerald-200">
                Inventory looks healthy.
              </p>
              <p className="mt-1 text-sm text-emerald-300/80">
                No items are currently below their reorder point.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-left text-sm">
                  <thead className="border-b border-slate-700 bg-slate-950">
                    <tr>
                      <TableHeader>Item</TableHeader>
                      <TableHeader>SKU</TableHeader>
                      <TableHeader>Available</TableHeader>
                      <TableHeader>Reorder Point</TableHeader>
                      <TableHeader>Shortage</TableHeader>
                      <TableHeader>Configured Order</TableHeader>
                      <TableHeader>Action</TableHeader>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {lowStockItems.map((item) => (
                      <tr
                        key={item.item_id}
                        className="transition hover:bg-slate-800/60"
                      >
                        <td className="px-4 py-4 font-semibold text-white">
                          {item.name}
                        </td>

                        <td className="px-4 py-4 font-mono text-slate-300">
                          {item.sku}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={
                              item.available_quantity === 0
                                ? "rounded-full bg-red-950 px-3 py-1 font-bold text-red-300"
                                : "rounded-full bg-amber-950 px-3 py-1 font-bold text-amber-300"
                            }
                          >
                            {item.available_quantity}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {item.reorder_point}
                        </td>

                        <td className="px-4 py-4 font-semibold text-amber-300">
                          {item.shortage_quantity}
                        </td>

                        <td className="px-4 py-4 text-slate-300">
                          {item.reorder_quantity}
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              handleReorderSuggestion(item.item_id)
                            }
                            disabled={suggestionLoading}
                            className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
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
            </div>
          )}
        </section>

        {/* Suggestion error */}
        {suggestionError && (
          <div className="mt-6 rounded-xl border border-red-500/40 bg-red-950/40 p-5">
            <p className="text-sm font-medium text-red-200">
              {suggestionError}
            </p>
          </div>
        )}

        {/* Reorder suggestion */}
        {selectedSuggestion && (
          <section className="mt-10 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-6 shadow-xl">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-400">
                  Intelligence
                </p>

                <h2 className="mt-2 text-2xl font-bold text-white">
                  Reorder Suggestion
                </h2>

                <p className="mt-2 text-sm text-slate-300">
                  Backend-generated reorder recommendation for{" "}
                  <span className="font-semibold text-white">
                    {selectedSuggestion.name}
                  </span>
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSuggestion(null)}
                className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <SuggestionCard
                label="SKU"
                value={selectedSuggestion.sku}
              />

              <SuggestionCard
                label="Available"
                value={selectedSuggestion.available_quantity}
              />

              <SuggestionCard
                label="Reorder Point"
                value={selectedSuggestion.reorder_point}
              />

              <SuggestionCard
                label="Suggested Quantity"
                value={selectedSuggestion.suggested_quantity}
                highlight
              />

              <SuggestionCard
                label="Lead Time"
                value={`${selectedSuggestion.lead_time_days} days`}
              />
            </div>

            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Recommendation
              </p>

              <p className="mt-2 text-lg font-bold text-white">
                {selectedSuggestion.is_low_stock
                  ? `Reorder ${selectedSuggestion.suggested_quantity} units.`
                  : "No reorder is currently required."}
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

interface DashboardCardProps {
  title: string;
  value: number;
  accent: "cyan" | "blue" | "amber" | "red" | "violet";
}

function DashboardCard({
  title,
  value,
  accent,
}: DashboardCardProps) {
  const accentClasses = {
    cyan: "border-cyan-500/30 text-cyan-300",
    blue: "border-blue-500/30 text-blue-300",
    amber: "border-amber-500/30 text-amber-300",
    red: "border-red-500/30 text-red-300",
    violet: "border-violet-500/30 text-violet-300",
  };

  return (
    <div
      className={`rounded-2xl border bg-slate-900 p-5 shadow-lg ${accentClasses[accent]}`}
    >
      <p className="text-sm font-semibold text-slate-400">
        {title}
      </p>

      <p className="mt-3 text-4xl font-black text-white">
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
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-lg">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-black text-white">
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
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={
          highlight
            ? "mt-2 text-3xl font-black text-cyan-300"
            : "mt-2 text-xl font-bold text-white"
        }
      >
        {value}
      </p>
    </div>
  );
}

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-400">
      {children}
    </th>
  );
}