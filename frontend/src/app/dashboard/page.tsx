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

export default function DashboardPage() {
  const [user, setUser] = useState<CurrentUser | null>(
    null,
  );

  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);

  const [lowStockItems, setLowStockItems] = 
    useState<LowStockItem[]>([]);

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
    <div className="max-w-6xl mx-auto">
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

      {/* Low stock items */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold">
          Low Stock Items
        </h2>

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
                    Suggested Order
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
                      {item.available_quantity}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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