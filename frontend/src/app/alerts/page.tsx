"use client";

import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Warehouse,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getCurrentUser } from "../lib/auth";
import {
  getInventoryAlerts,
  type AlertSeverity,
  type InventoryAlert,
} from "../lib/alerts";

type SeverityFilter = "all" | AlertSeverity;

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getSeverityLabel(severity: AlertSeverity): string {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    case "notice":
      return "Notice";
  }
}

function getSeverityClasses(severity: AlertSeverity): string {
  switch (severity) {
    case "critical":
      return "border-red-500/30 bg-red-500/10 text-red-300";

    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";

    case "notice":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }
}

function getSeverityIcon(severity: AlertSeverity) {
  switch (severity) {
    case "critical":
      return ShieldAlert;

    case "warning":
      return AlertTriangle;

    case "notice":
      return Bell;
  }
}

function getAlertTypeLabel(type: InventoryAlert["type"]): string {
  switch (type) {
    case "out_of_stock":
      return "Out of stock";

    case "low_stock":
      return "Low stock";

    case "expired":
      return "Expired";

    case "expiring_soon":
      return "Expiring soon";

    case "expiring":
      return "Expiring";
  }
}

function getExpiryText(alert: InventoryAlert): string | null {
  if (alert.days_until_expiry === null) {
    return null;
  }

  if (alert.days_until_expiry < 0) {
    const days = Math.abs(alert.days_until_expiry);

    return `${days} day${days === 1 ? "" : "s"} expired`;
  }

  if (alert.days_until_expiry === 0) {
    return "Expires today";
  }

  return `Expires in ${alert.days_until_expiry} day${
    alert.days_until_expiry === 1 ? "" : "s"
  }`;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [severity, setSeverity] =
    useState<SeverityFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadAlerts(showRefreshState = false) {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const user = await getCurrentUser();

      const result = await getInventoryAlerts(
        user.organization_id,
      );

      setAlerts(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load inventory alerts.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadAlerts();
  }, []);

  const counts = useMemo(() => {
    return {
      total: alerts.length,
      critical: alerts.filter(
        (alert) => alert.severity === "critical",
      ).length,
      warning: alerts.filter(
        (alert) => alert.severity === "warning",
      ).length,
      notice: alerts.filter(
        (alert) => alert.severity === "notice",
      ).length,
    };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return alerts.filter((alert) => {
      const matchesSeverity =
        severity === "all" ||
        alert.severity === severity;

      if (!matchesSeverity) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        alert.title,
        alert.message,
        alert.sku,
        alert.item_name,
        alert.lot_number ?? "",
        alert.location_name ?? "",
        getAlertTypeLabel(alert.type),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [alerts, search, severity]);

  return (
    <div className="min-h-full bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-400">
              <Bell className="h-4 w-4" />
              Inventory Intelligence
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Alert Center
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Monitor stock shortages, expired inventory, and
              upcoming expiry risks.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAlerts(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh alerts
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

            <div>
              <p className="font-medium text-red-300">
                Unable to load alerts
              </p>

              <p className="mt-1 text-sm text-red-200/80">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setSeverity("all")}
            className={`rounded-xl border p-4 text-left transition ${
              severity === "all"
                ? "border-slate-600 bg-slate-800"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                All alerts
              </span>

              <Bell className="h-4 w-4 text-slate-400" />
            </div>

            <div className="mt-2 text-2xl font-bold text-white">
              {counts.total}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSeverity("critical")}
            className={`rounded-xl border p-4 text-left transition ${
              severity === "critical"
                ? "border-red-500/40 bg-red-500/10"
                : "border-slate-800 bg-slate-900 hover:border-red-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-red-300">
                Critical
              </span>

              <ShieldAlert className="h-4 w-4 text-red-400" />
            </div>

            <div className="mt-2 text-2xl font-bold text-white">
              {counts.critical}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSeverity("warning")}
            className={`rounded-xl border p-4 text-left transition ${
              severity === "warning"
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-slate-800 bg-slate-900 hover:border-amber-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-amber-300">
                Warning
              </span>

              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>

            <div className="mt-2 text-2xl font-bold text-white">
              {counts.warning}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSeverity("notice")}
            className={`rounded-xl border p-4 text-left transition ${
              severity === "notice"
                ? "border-blue-500/40 bg-blue-500/10"
                : "border-slate-800 bg-slate-900 hover:border-blue-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-blue-300">
                Notice
              </span>

              <CheckCircle2 className="h-4 w-4 text-blue-400" />
            </div>

            <div className="mt-2 text-2xl font-bold text-white">
              {counts.notice}
            </div>
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search item, SKU, lot, location..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["critical", "Critical"],
                  ["warning", "Warning"],
                  ["notice", "Notice"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSeverity(value)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    severity === value
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
            <RefreshCw className="mx-auto h-7 w-7 animate-spin text-blue-400" />

            <p className="mt-3 text-sm font-medium text-slate-300">
              Loading inventory alerts...
            </p>
          </div>
        )}

        {/* Empty */}
        {!loading && filteredAlerts.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-white">
              No alerts found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              {search || severity !== "all"
                ? "No alerts match your current filters."
                : "Your inventory currently has no active stock or expiry alerts."}
            </p>

            {(search || severity !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSeverity("all");
                }}
                className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Alert list */}
        {!loading && filteredAlerts.length > 0 && (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const SeverityIcon = getSeverityIcon(
                alert.severity,
              );

              const expiryText = getExpiryText(alert);

              return (
                <article
                  key={alert.id}
                  className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getSeverityClasses(
                              alert.severity,
                            )}`}
                          >
                            <SeverityIcon className="h-3.5 w-3.5" />

                            {getSeverityLabel(
                              alert.severity,
                            )}
                          </span>

                          <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                            {getAlertTypeLabel(alert.type)}
                          </span>
                        </div>

                        <h2 className="mt-3 text-base font-semibold text-white sm:text-lg">
                          {alert.title}
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-400">
                          {alert.message}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <Link
                          href={`/inventory?item=${alert.item_id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-700 hover:text-white"
                        >
                          <Package className="h-4 w-4" />
                          View item
                        </Link>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Item
                        </div>

                        <div className="mt-1 font-medium text-slate-100">
                          {alert.item_name}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500">
                          SKU: {alert.sku}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Stock
                        </div>

                        <div className="mt-1 font-semibold text-white">
                          {alert.available_quantity} units
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500">
                          Reorder point:{" "}
                          {alert.reorder_point}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Location
                        </div>

                        <div className="mt-1 flex items-center gap-1.5 font-medium text-slate-200">
                          <Warehouse className="h-3.5 w-3.5 text-slate-500" />

                          {alert.location_name ?? "All locations"}
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500">
                          Lot: {alert.lot_number ?? "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Expiry
                        </div>

                        {alert.expiry_date ? (
                          <>
                            <div className="mt-1 flex items-center gap-1.5 font-medium text-slate-200">
                              <Clock3 className="h-3.5 w-3.5 text-slate-500" />

                              {formatDate(
                                alert.expiry_date,
                              )}
                            </div>

                            <div
                              className={`mt-0.5 text-xs ${
                                alert.days_until_expiry !==
                                  null &&
                                alert.days_until_expiry <
                                  0
                                  ? "text-red-400"
                                  : alert.days_until_expiry !==
                                      null &&
                                    alert.days_until_expiry <=
                                      7
                                  ? "text-amber-400"
                                  : "text-slate-500"
                              }`}
                            >
                              {expiryText}
                            </div>
                          </>
                        ) : (
                          <div className="mt-1 text-sm text-slate-500">
                            No expiry date
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && filteredAlerts.length > 0 && (
          <div className="mt-4 text-center text-xs text-slate-500">
            Showing {filteredAlerts.length} of{" "}
            {alerts.length} alerts
          </div>
        )}
      </div>
    </div>
  );
}