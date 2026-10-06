"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getCurrentUser,
  type CurrentUser,
} from "../lib/auth";

import {
  getStockMovements,
  type StockMovement,
} from "../lib/stock-movements";

export default function StockMovementsPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMovements() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        const movementHistory = await getStockMovements(
          currentUser.organization_id,
        );

        setMovements(movementHistory);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load stock movements",
        );
      }
    }

    loadMovements();
  }, []);

  const totalQuantity = useMemo(
    () =>
      movements.reduce(
        (total, movement) => total + movement.quantity,
        0,
      ),
    [movements],
  );

  const movementTypes = useMemo(() => {
    return new Set(
      movements.map((movement) => movement.movement_type),
    ).size;
  }, [movements]);

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100 sm:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-6">
            <h1 className="text-2xl font-bold text-white">
              Stock Movements
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
          <p className="font-medium">
            Loading stock movements...
          </p>
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
                Stock Movements
              </h1>

              <p className="mt-2 text-slate-300">
                Immutable history of inventory activity.
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
            label="Movement Records"
            value={movements.length}
            accent="cyan"
          />

          <SummaryCard
            label="Total Quantity Moved"
            value={totalQuantity}
            accent="blue"
          />

          <SummaryCard
            label="Movement Types"
            value={movementTypes}
            accent="violet"
          />
        </section>

        {/* History */}
        {movements.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
            <p className="text-lg font-bold text-white">
              No stock movements found.
            </p>

            <p className="mt-2 text-sm text-slate-400">
              No inventory movement history is currently available.
            </p>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-700 px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-bold text-white">
                  Movement History
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {movements.length} recorded movement
                  {movements.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="text-sm text-slate-400">
                Total quantity{" "}
                <span className="font-bold text-cyan-300">
                  {totalQuantity}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1250px] w-full text-left text-sm">
                <thead className="border-b border-slate-700 bg-slate-950">
                  <tr>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Item</TableHeader>
                    <TableHeader>SKU</TableHeader>
                    <TableHeader>Movement</TableHeader>
                    <TableHeader>Quantity</TableHeader>
                    <TableHeader>Location</TableHeader>
                    <TableHeader>Lot</TableHeader>
                    <TableHeader>Performed By</TableHeader>
                    <TableHeader>Reason</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {movements.map((movement) => (
                    <tr
                      key={movement.id}
                      className="transition hover:bg-slate-800/60"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-400">
                        {new Date(
                          movement.created_at,
                        ).toLocaleString()}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-white">
                          {movement.item_name}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span className="font-mono text-cyan-300">
                          {movement.sku}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <MovementBadge
                          movementType={movement.movement_type}
                        />
                      </td>

                      <td className="px-4 py-4">
                        <span className="font-black text-white">
                          {movement.quantity}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-200">
                        {movement.location_name}
                      </td>

                      <td className="px-4 py-4">
                        {movement.lot_number ? (
                          <span className="rounded-md bg-slate-800 px-2 py-1 font-mono text-xs text-slate-300">
                            {movement.lot_number}
                          </span>
                        ) : (
                          <span className="text-slate-600">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {movement.performed_by_name ?? "—"}
                      </td>

                      <td className="max-w-xs px-4 py-4 text-slate-400">
                        {movement.reason ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-800 bg-slate-950/70 px-5 py-4">
              <p className="text-xs text-slate-500">
                Stock movements are append-only records. Corrections
                should be represented by adjustment movements rather
                than editing historical records.
              </p>
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
  accent: "cyan" | "blue" | "violet";
}) {
  const borderClasses = {
    cyan: "border-cyan-500/30",
    blue: "border-blue-500/30",
    violet: "border-violet-500/30",
  };

  const valueClasses = {
    cyan: "text-cyan-300",
    blue: "text-blue-300",
    violet: "text-violet-300",
  };

  return (
    <div
      className={`rounded-2xl border bg-slate-900 p-5 shadow-lg ${borderClasses[accent]}`}
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

function MovementBadge({
  movementType,
}: {
  movementType: string;
}) {
  const normalized = movementType.toLowerCase();

  let classes =
    "border-slate-600 bg-slate-800 text-slate-300";

  if (
    normalized.includes("receive") ||
    normalized.includes("receipt")
  ) {
    classes =
      "border-emerald-500/30 bg-emerald-950 text-emerald-300";
  } else if (normalized.includes("issue")) {
    classes =
      "border-blue-500/30 bg-blue-950 text-blue-300";
  } else if (normalized.includes("wastage")) {
    classes =
      "border-red-500/30 bg-red-950 text-red-300";
  } else if (normalized.includes("transfer")) {
    classes =
      "border-violet-500/30 bg-violet-950 text-violet-300";
  } else if (normalized.includes("adjust")) {
    classes =
      "border-amber-500/30 bg-amber-950 text-amber-300";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${classes}`}
    >
      {movementType}
    </span>
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