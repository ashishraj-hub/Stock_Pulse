"use client";

import { useEffect, useState } from "react";

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

  const [movements, setMovements] = useState<
    StockMovement[]
  >([]);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMovements() {
      try {
        const currentUser = await getCurrentUser();

        setUser(currentUser);

        const movementHistory =
          await getStockMovements(
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

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold">
          Stock Movements
        </h1>

        <p className="mt-4 text-red-600">
          {error}
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading stock movements...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Stock Movements
          </h1>

          <p className="mt-2 text-gray-600">
            Welcome, {user.name}
          </p>

          <p className="text-sm text-gray-500">
            Role: {user.role}
          </p>
        </div>

        {movements.length === 0 ? (
          <p className="text-gray-500">
            No stock movements found.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Date
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Item
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    SKU
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Movement
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Quantity
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Location
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Lot
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Performed By
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Reason
                  </th>
                </tr>
              </thead>

              <tbody>
                {movements.map((movement) => (
                  <tr
                    key={movement.id}
                    className="border-b last:border-b-0"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(
                        movement.created_at,
                      ).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {movement.item_name}
                    </td>

                    <td className="px-4 py-3">
                      {movement.sku}
                    </td>

                    <td className="px-4 py-3">
                      {movement.movement_type}
                    </td>

                    <td className="px-4 py-3">
                      {movement.quantity}
                    </td>

                    <td className="px-4 py-3">
                      {movement.location_name}
                    </td>

                    <td className="px-4 py-3">
                      {movement.lot_number ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      {movement.performed_by_name ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      {movement.reason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}