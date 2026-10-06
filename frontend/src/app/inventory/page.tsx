"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getCurrentUser,
  type CurrentUser,
} from "../lib/auth";

import {
  getInventory,
  type InventoryListItem,
} from "../lib/inventory";

export default function InventoryPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [inventory, setInventory] = useState<InventoryListItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInventory() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        const inventoryItems = await getInventory(
          currentUser.organization_id,
        );

        setInventory(inventoryItems);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load inventory",
        );
      }
    }

    loadInventory();
  }, []);

  const totals = useMemo(() => {
    return inventory.reduce(
      (acc, item) => {
        acc.onHand += item.quantity_on_hand;
        acc.reserved += item.reserved_quantity;
        acc.available += item.available_quantity;
        return acc;
      },
      {
        onHand: 0,
        reserved: 0,
        available: 0,
      },
    );
  }, [inventory]);

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100 sm:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-6">
            <h1 className="text-2xl font-bold text-white">
              Inventory
            </h1>
            <p className="mt-3 text-red-200">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-5 shadow-xl">
          <p className="font-medium">Loading inventory...</p>
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
                Inventory
              </h1>

              <p className="mt-2 text-slate-300">
                Physical stock by item, location, and batch.
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                User
              </p>

              <p className="mt-1 font-bold text-white">
                {user.name}
              </p>

              <p className="mt-1 text-xs font-semibold text-cyan-300">
                {user.role}
              </p>
            </div>
          </div>
        </header>

        {/* Summary */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Inventory Lots"
            value={inventory.length}
            accent="cyan"
          />

          <SummaryCard
            label="Units On Hand"
            value={totals.onHand}
            accent="blue"
          />

          <SummaryCard
            label="Available Units"
            value={totals.available}
            accent="emerald"
          />
        </section>

        {/* Inventory table */}
        {inventory.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
            <p className="text-lg font-bold text-white">
              No inventory records found.
            </p>

            <p className="mt-2 text-sm text-slate-400">
              There are currently no inventory lots for this organization.
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-700 px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-bold text-white">
                  Current Stock
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {inventory.length} inventory lot
                  {inventory.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="text-sm text-slate-400">
                Available{" "}
                <span className="font-bold text-emerald-300">
                  {totals.available}
                </span>{" "}
                units
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full text-left text-sm">
                <thead className="border-b border-slate-700 bg-slate-950">
                  <tr>
                    <TableHeader>Item</TableHeader>
                    <TableHeader>SKU</TableHeader>
                    <TableHeader>Location</TableHeader>
                    <TableHeader>Lot</TableHeader>
                    <TableHeader>Expiry</TableHeader>
                    <TableHeader>On Hand</TableHeader>
                    <TableHeader>Reserved</TableHeader>
                    <TableHeader>Available</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {inventory.map((item) => (
                    <tr
                      key={item.inventory_lot_id}
                      className="transition hover:bg-slate-800/60"
                    >
                      <td className="px-4 py-4">
                        <p className="font-bold text-white">
                          {item.item_name}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span className="font-mono text-cyan-300">
                          {item.sku}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-200">
                        {item.location_name}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-md bg-slate-800 px-2 py-1 font-mono text-xs font-semibold text-slate-300">
                          {item.lot_number}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {item.expiry_date ? (
                          <span className="text-slate-200">
                            {item.expiry_date}
                          </span>
                        ) : (
                          <span className="text-slate-600">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span className="font-bold text-white">
                          {item.quantity_on_hand}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={
                            item.reserved_quantity > 0
                              ? "font-bold text-amber-300"
                              : "text-slate-400"
                          }
                        >
                          {item.reserved_quantity}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={
                            item.available_quantity <= 0
                              ? "rounded-full bg-red-950 px-3 py-1 font-bold text-red-300"
                              : "rounded-full bg-emerald-950 px-3 py-1 font-bold text-emerald-300"
                          }
                        >
                          {item.available_quantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-800 bg-slate-950/70 px-5 py-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                <span>
                  On hand:{" "}
                  <strong className="text-slate-300">
                    {totals.onHand}
                  </strong>
                </span>

                <span>
                  Reserved:{" "}
                  <strong className="text-amber-300">
                    {totals.reserved}
                  </strong>
                </span>

                <span>
                  Available:{" "}
                  <strong className="text-emerald-300">
                    {totals.available}
                  </strong>
                </span>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "cyan" | "blue" | "emerald";
}) {
  const classes = {
    cyan: "border-cyan-500/30",
    blue: "border-blue-500/30",
    emerald: "border-emerald-500/30",
  };

  const valueClasses = {
    cyan: "text-cyan-300",
    blue: "text-blue-300",
    emerald: "text-emerald-300",
  };

  return (
    <div
      className={`rounded-2xl border bg-slate-900 p-5 shadow-lg ${classes[accent]}`}
    >
      <p className="text-sm font-semibold text-slate-400">
        {label}
      </p>

      <p
        className={`mt-3 text-4xl font-black ${valueClasses[accent]}`}
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