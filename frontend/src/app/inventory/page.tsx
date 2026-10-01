"use client";

import { useEffect, useState } from "react";

import {
  getCurrentUser,
  type CurrentUser,
} from "../lib/auth";

import {
  getInventory,
  type InventoryListItem,
} from "../lib/inventory";

export default function InventoryPage() {
  const [user, setUser] = useState<CurrentUser | null>(
    null,
  );

  const [inventory, setInventory] = useState<
    InventoryListItem[]
  >([]);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInventory() {
      try {
        const currentUser = await getCurrentUser();

        setUser(currentUser);

        const inventoryItems =
          await getInventory(
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

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold">
          StockPulse Inventory
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
        <p>Loading inventory...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Inventory
          </h1>

          <p className="mt-2 text-gray-600">
            Welcome, {user.name}
          </p>

          <p className="text-sm text-gray-500">
            Role: {user.role}
          </p>
        </div>

        {inventory.length === 0 ? (
          <p className="text-gray-500">
            No inventory records found.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
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
                    Location
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Lot
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Expiry
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    On Hand
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Reserved
                  </th>

                  <th className="px-4 py-3 font-semibold">
                    Available
                  </th>
                </tr>
              </thead>

              <tbody>
                {inventory.map((item) => (
                  <tr
                    key={item.inventory_lot_id}
                    className="border-b last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium">
                      {item.item_name}
                    </td>

                    <td className="px-4 py-3">
                      {item.sku}
                    </td>

                    <td className="px-4 py-3">
                      {item.location_name}
                    </td>

                    <td className="px-4 py-3">
                      {item.lot_number}
                    </td>

                    <td className="px-4 py-3">
                      {item.expiry_date ?? "—"}
                    </td>

                    <td className="px-4 py-3">
                      {item.quantity_on_hand}
                    </td>

                    <td className="px-4 py-3">
                      {item.reserved_quantity}
                    </td>

                    <td className="px-4 py-3">
                      {item.available_quantity}
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