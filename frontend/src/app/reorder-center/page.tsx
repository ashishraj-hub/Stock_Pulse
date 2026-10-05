"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock3,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";

import { getCurrentUser, type CurrentUser } from "../lib/auth";
import {
  getReorderCenter,
  type ReorderCenterItem,
} from "../lib/reorder-center";

export default function ReorderCenterPage() {
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [items, setItems] = useState<ReorderCenterItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReorderCenter() {
      try {
        setLoading(true);
        setError("");

        const user = await getCurrentUser();

        setCurrentUser(user);

        const data = await getReorderCenter(
          user.organization_id,
        );

        setItems(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load Reorder Center.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadReorderCenter();
  }, []);

  const lowStockItems = useMemo(
    () => items.filter((item) => item.is_low_stock),
    [items],
  );

  const totalSuggestedUnits = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + item.suggested_quantity,
        0,
      ),
    [items],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-32">
          <div className="flex items-center gap-3 text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            Loading Reorder Center...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-400">
                <ShoppingCart className="h-4 w-4" />
                StockPulse Procurement
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white">
                Reorder Center
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Review inventory items that may require
                replenishment and open their demand-based
                Smart Reorder analysis.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Dashboard
              </Link>

              <Link
                href="/smart-reorder"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
              >
                <BarChart3 className="h-4 w-4" />
                Smart Reorder
              </Link>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <section className="rounded-2xl border border-red-500/30 bg-red-950/40 px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

              <div>
                <p className="font-semibold text-red-300">
                  Reorder Center error
                </p>

                <p className="mt-1 text-sm text-red-200">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Summary */}
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Items in Reorder Center"
            value={items.length}
            icon={
              <Boxes className="h-6 w-6" />
            }
            accent="cyan"
          />

          <MetricCard
            label="Currently Low Stock"
            value={lowStockItems.length}
            icon={
              <AlertTriangle className="h-6 w-6" />
            }
            accent="red"
          />

          <MetricCard
            label="Suggested Reorder Units"
            value={totalSuggestedUnits}
            icon={
              <PackageCheck className="h-6 w-6" />
            }
            accent="emerald"
          />
        </section>

        {/* Main table */}
        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
          <div className="border-b border-slate-700 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-white">
                  Replenishment Candidates
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Review the current inventory position before
                  opening the demand-based Smart Reorder analysis.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-400">
                <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                Live inventory position
              </div>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950">
                <PackageCheck className="h-7 w-7 text-emerald-400" />
              </div>

              <p className="text-sm font-bold text-white">
                No replenishment candidates found.
              </p>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                StockPulse currently has no items returned by
                the Reorder Center.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-950">
                  <tr className="border-b border-slate-700">
                    <TableHeader>Item</TableHeader>
                    <TableHeader>Available</TableHeader>
                    <TableHeader>Reorder Point</TableHeader>
                    <TableHeader>Suggested Qty</TableHeader>
                    <TableHeader>Lead Time</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Action</TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.item_id}
                      className="border-b border-slate-800 transition last:border-b-0 hover:bg-slate-800/50"
                    >
                      {/* Item */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-950/40">
                            <Boxes className="h-5 w-5 text-cyan-400" />
                          </div>

                          <div>
                            <p className="text-sm font-bold text-white">
                              {item.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              SKU: {item.sku}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Available */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`text-sm font-bold ${
                            item.is_low_stock
                              ? "text-red-300"
                              : "text-white"
                          }`}
                        >
                          {item.available_quantity}
                        </span>
                      </td>

                      {/* Reorder Point */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-sm text-slate-300">
                          {item.reorder_point}
                        </span>
                      </td>

                      {/* Suggested */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="rounded-lg border border-cyan-500/20 bg-cyan-950/40 px-2.5 py-1 text-sm font-bold text-cyan-300">
                          {item.suggested_quantity}
                        </span>
                      </td>

                      {/* Lead time */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <Clock3 className="h-4 w-4 text-slate-500" />
                          {item.lead_time_days} days
                        </div>
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusBadge
                          isLowStock={
                            item.is_low_stock
                          }
                        />
                      </td>

                      {/* Action */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <Link
                          href={`/smart-reorder?itemId=${encodeURIComponent(
                            item.item_id,
                          )}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-400"
                        >
                          Analyze
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Footer context */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-xs text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Reorder suggestions are based on the current inventory and
          configured item reorder settings.
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: "cyan" | "red" | "emerald";
}) {
  const styles = {
    cyan: {
      border: "border-cyan-500/20",
      background: "bg-cyan-950/30",
      icon: "text-cyan-400",
    },
    red: {
      border: "border-red-500/20",
      background: "bg-red-950/30",
      icon: "text-red-400",
    },
    emerald: {
      border: "border-emerald-500/20",
      background: "bg-emerald-950/30",
      icon: "text-emerald-400",
    },
  };

  const style = styles[accent];

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-black text-white">
            {value}
          </p>
        </div>

        <div
          className={`rounded-xl border p-3 ${style.border} ${style.background} ${style.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th
      scope="col"
      className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
    >
      {children}
    </th>
  );
}

function StatusBadge({
  isLowStock,
}: {
  isLowStock: boolean;
}) {
  if (isLowStock) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-950/50 px-3 py-1 text-xs font-bold text-red-300">
        <AlertTriangle className="h-3.5 w-3.5" />
        Low Stock
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/50 px-3 py-1 text-xs font-bold text-emerald-300">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Above Reorder Point
    </span>
  );
}