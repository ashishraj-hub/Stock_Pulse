"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { getCurrentUser, type CurrentUser } from "../lib/auth";
import {
  getReorderCenter,
  type ReorderCenterItem,
} from "../lib/reorder-center";

const ORGANIZATION_ID =
  "addc299a-6ab4-4399-83ab-490ce15f3faa";

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
        (total, item) => total + item.suggested_quantity,
        0,
      ),
    [items],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              Loading Reorder Center...
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">
              StockPulse Procurement
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Reorder Center
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Review inventory items that may require
              replenishment and open their Smart Reorder analysis.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
            >
              Dashboard
            </Link>

            <Link
              href="/smart-reorder"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Smart Reorder
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Summary */}
        <section className="grid gap-4 md:grid-cols-3">

          <MetricCard
            label="Items in Reorder Center"
            value={items.length}
          />

          <MetricCard
            label="Currently Low Stock"
            value={lowStockItems.length}
          />

          <MetricCard
            label="Suggested Reorder Units"
            value={totalSuggestedUnits}
          />

        </section>

        {/* Main table */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Replenishment Candidates
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Review the current inventory position before
              opening the demand-based Smart Reorder analysis.
            </p>
          </div>

          {items.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-700">
                No replenishment candidates found.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                StockPulse currently has no items returned by the
                Reorder Center.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">

                <thead className="bg-slate-50">
                  <tr>
                    <TableHeader>Item</TableHeader>
                    <TableHeader>Available</TableHeader>
                    <TableHeader>Reorder Point</TableHeader>
                    <TableHeader>Suggested Qty</TableHeader>
                    <TableHeader>Lead Time</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Action</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">

                  {items.map((item) => (
                    <tr
                      key={item.item_id}
                      className="hover:bg-slate-50"
                    >

                      {/* Item */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {item.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            SKU: {item.sku}
                          </p>
                        </div>
                      </td>

                      {/* Available */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-sm font-semibold text-slate-900">
                          {item.available_quantity}
                        </span>
                      </td>

                      {/* Reorder Point */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-sm text-slate-700">
                          {item.reorder_point}
                        </span>
                      </td>

                      {/* Suggested */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-sm font-semibold text-blue-700">
                          {item.suggested_quantity}
                        </span>
                      </td>

                      {/* Lead time */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="text-sm text-slate-700">
                          {item.lead_time_days} days
                        </span>
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusBadge
                          isLowStock={item.is_low_stock}
                        />
                      </td>

                      {/* Action */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <Link
                          href={`/smart-reorder?itemId=${encodeURIComponent(
                            item.item_id,
                          )}`}
                          className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Analyze
                        </Link>
                      </td>

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
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
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
    <th
      scope="col"
      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
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
      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        Low Stock
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      Above Reorder Point
    </span>
  );
}