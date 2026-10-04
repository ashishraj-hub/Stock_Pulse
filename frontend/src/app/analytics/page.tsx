"use client";

import { useEffect, useMemo, useState } from "react";

import { getCurrentUser, type CurrentUser } from "../lib/auth";
import {
  getAnalyticsSummary,
  type AnalyticsSummary,
} from "../lib/analytics";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDecimal(value: number): string {
  return value.toFixed(2);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>

      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>

      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function MovementCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold text-slate-950">
        {formatNumber(value)}
      </p>

      <p className="mt-1 text-xs text-slate-500">units</p>
    </div>
  );
}

function UsageChart({
  dailyUsage,
}: {
  dailyUsage: AnalyticsSummary["daily_usage"];
}) {
  const recentUsage = useMemo(() => {
    return dailyUsage.slice(-14);
  }, [dailyUsage]);

  const maxQuantity = Math.max(
    ...recentUsage.map((entry) => entry.quantity),
    1,
  );

  return (
    <div>
      <div className="flex h-64 items-end gap-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-4 pb-4 pt-6">
        {recentUsage.map((entry) => {
          const height =
            entry.quantity === 0
              ? 4
              : Math.max(8, (entry.quantity / maxQuantity) * 190);

          return (
            <div
              key={entry.date}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
            >
              <span className="text-[10px] font-medium text-slate-500">
                {entry.quantity}
              </span>

              <div
                className="w-full max-w-8 rounded-t-md bg-slate-900"
                style={{ height }}
                title={`${formatDate(entry.date)}: ${entry.quantity} units`}
              />

              <span className="text-[10px] text-slate-400">
                {new Date(`${entry.date}T00:00:00`).getDate()}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Last {recentUsage.length} days</span>
        <span>Daily issued units</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        setError("");

        const user = await getCurrentUser();

        if (!user) {
          setError("You are not authenticated.");
          return;
        }

        setCurrentUser(user);

        const data = await getAnalyticsSummary(user.organization_id, {
          historyDays: 30,
          expiringDays: 30,
        });

        setAnalytics(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load analytics.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">
              Loading analytics...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold text-red-900">
              Unable to load analytics
            </h1>

            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!analytics || !currentUser) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <p className="text-sm text-slate-500">
              No analytics data available.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Stock & Usage Analytics
              </p>

              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                Inventory intelligence
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Monitor inventory health, stock movements, usage patterns,
                forecast demand, and upcoming expiry risks.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
              <p className="text-xs text-slate-500">Analysis window</p>
              <p className="mt-1 font-medium text-slate-900">
                Last 30 days
              </p>
            </div>
          </div>
        </section>

        {/* Inventory overview */}
        <section>
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-slate-950">
              Inventory Overview
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total Items"
              value={analytics.total_items}
              description="Unique inventory items"
            />

            <MetricCard
              label="Available Units"
              value={analytics.total_available_units}
              description="Current available stock"
            />

            <MetricCard
              label="Low Stock"
              value={analytics.low_stock_count}
              description="Items at or below reorder point"
            />

            <MetricCard
              label="Out of Stock"
              value={analytics.out_of_stock_count}
              description="Items with no available stock"
            />
          </div>
        </section>

        {/* Usage + Forecast */}
        <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Usage Trend
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Daily stock issued over the recent period.
                </p>
              </div>

              <div className="flex gap-5">
                <div>
                  <p className="text-xs text-slate-500">
                    Average daily usage
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {formatDecimal(analytics.average_daily_usage)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Predicted daily usage
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {formatDecimal(analytics.predicted_daily_usage)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <UsageChart dailyUsage={analytics.daily_usage} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Reorder Intelligence
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Forecast-driven replenishment opportunities.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Forecast reorder candidates
                </p>

                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {formatNumber(analytics.forecast_reorder_count)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Suggested reorder units
                </p>

                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {formatNumber(analytics.forecast_reorder_units)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stock movement */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Stock Movement
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Units recorded through inventory transactions.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MovementCard
              label="Received"
              value={analytics.movement_summary.receive}
            />

            <MovementCard
              label="Issued"
              value={analytics.movement_summary.issue}
            />

            <MovementCard
              label="Wastage"
              value={analytics.movement_summary.wastage}
            />

            <MovementCard
              label="Transfers"
              value={analytics.movement_summary.transfer}
            />
          </div>
        </section>

        {/* Top consumed items */}
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              Top Consumed Items
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Items with the highest issued quantity.
            </p>

            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              {analytics.top_consumed_items.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">
                  No consumption data available.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {analytics.top_consumed_items.map((item, index) => (
                    <div
                      key={item.item_id}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {item.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.sku}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-slate-950">
                          {formatNumber(item.quantity)}
                        </p>

                        <p className="text-xs text-slate-500">
                          units issued
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Expiring inventory */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Expiring Inventory
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Inventory approaching its expiry date.
                </p>
              </div>

              {analytics.expiring_items.length > 0 && (
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                  {analytics.expiring_items.length} at risk
                </span>
              )}
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              {analytics.expiring_items.length === 0 ? (
                <div className="p-5 text-sm text-slate-500">
                  No inventory is approaching expiry.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {analytics.expiring_items.map((item) => (
                    <div
                      key={`${item.item_id}-${item.lot_number}-${item.expiry_date}`}
                      className="p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {item.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.sku} · Lot {item.lot_number}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-red-700">
                            {item.days_until_expiry === 0
                              ? "Expires today"
                              : `${item.days_until_expiry} day${
                                  item.days_until_expiry === 1 ? "" : "s"
                                }`}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(item.expiry_date)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          Quantity at risk
                        </span>

                        <span className="font-semibold text-slate-900">
                          {formatNumber(item.quantity)} units
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}