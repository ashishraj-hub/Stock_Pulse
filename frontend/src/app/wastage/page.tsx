"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  getCurrentUser,
  type CurrentUser,
} from "../lib/auth";

import {
  getStockMovements,
  type StockMovement,
} from "../lib/stock-movements";

type DateFilter = "all" | "7" | "30" | "90";

export default function WastagePage() {
  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [movements, setMovements] =
    useState<StockMovement[]>([]);

  const [search, setSearch] =
    useState("");

  const [locationFilter, setLocationFilter] =
    useState("");

  const [dateFilter, setDateFilter] =
    useState<DateFilter>("all");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadWastage() {
      try {
        setLoading(true);
        setError("");

        const currentUser =
          await getCurrentUser();

        setUser(currentUser);

        const movementHistory =
          await getStockMovements(
            currentUser.organization_id,
          );

        setMovements(
          movementHistory.filter(
            (movement) =>
              movement.movement_type ===
              "wastage",
          ),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load wastage records",
        );
      } finally {
        setLoading(false);
      }
    }

    loadWastage();
  }, []);

  const locationOptions = useMemo(() => {
    const locations = new Set<string>();

    for (const movement of movements) {
      locations.add(
        movement.location_name,
      );
    }

    return Array.from(locations).sort();
  }, [movements]);

  const filteredMovements = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    let result = movements;

    if (normalizedSearch) {
      result = result.filter(
        (movement) =>
          movement.item_name
            .toLowerCase()
            .includes(normalizedSearch) ||
          movement.sku
            .toLowerCase()
            .includes(normalizedSearch) ||
          (
            movement.lot_number ?? ""
          )
            .toLowerCase()
            .includes(normalizedSearch) ||
          (
            movement.reason ?? ""
          )
            .toLowerCase()
            .includes(normalizedSearch),
      );
    }

    if (locationFilter) {
      result = result.filter(
        (movement) =>
          movement.location_name ===
          locationFilter,
      );
    }

    if (dateFilter !== "all") {
      const days =
        Number(dateFilter);

      const cutoff =
        new Date();

      cutoff.setDate(
        cutoff.getDate() - days,
      );

      result = result.filter(
        (movement) =>
          new Date(
            movement.created_at,
          ) >= cutoff,
      );
    }

    return result;
  }, [
    movements,
    search,
    locationFilter,
    dateFilter,
  ]);

  const totalWastage = useMemo(() => {
    return filteredMovements.reduce(
      (total, movement) =>
        total + movement.quantity,
      0,
    );
  }, [filteredMovements]);

  const affectedItems = useMemo(() => {
    return new Set(
      filteredMovements.map(
        (movement) =>
          movement.item_id,
      ),
    ).size;
  }, [filteredMovements]);

  const latestWastage = useMemo(() => {
    if (filteredMovements.length === 0) {
      return null;
    }

    return filteredMovements.reduce(
      (latest, movement) =>
        new Date(
          movement.created_at,
        ) >
        new Date(
          latest.created_at,
        )
          ? movement
          : latest,
    );
  }, [filteredMovements]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020617] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-8 shadow-xl">
            <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-800" />

            <div className="mt-3 h-4 w-80 animate-pulse rounded bg-slate-800" />

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    key={item}
                    className="h-32 animate-pulse rounded-xl bg-slate-800"
                  />
                ),
              )}
            </div>

            <p className="mt-8 text-sm text-slate-400">
              Loading wastage records...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#020617] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="rounded-2xl border border-red-900/60 bg-[#0f172a] p-8 shadow-xl">
            <h1 className="text-2xl font-bold text-white">
              Wastage Management
            </h1>

            <div className="mt-6 rounded-xl border border-red-900/70 bg-red-950/30 p-5">
              <p className="text-sm font-medium text-red-300">
                Unable to load wastage records
              </p>

              <p className="mt-2 text-sm text-red-400">
                {error}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">

        {/* =========================================================
            PAGE HEADER
        ========================================================== */}
        <section className="mb-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-red-300">
                  Inventory Control
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Wastage Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                Track, review and analyse inventory
                wastage across your organisation.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>
                  Welcome,{" "}
                  <span className="font-medium text-slate-300">
                    {user.name}
                  </span>
                </span>

                <span className="text-slate-700">
                  •
                </span>

                <span>
                  Role:{" "}
                  <span className="font-medium capitalize text-slate-300">
                    {user.role}
                  </span>
                </span>
              </div>
            </div>

            {(user.role === "admin" ||
              user.role === "staff") && (
              <Link
                href="/stock-operations?operation=wastage"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-950/20 transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                <span className="text-lg leading-none">
                  +
                </span>

                Record Wastage
              </Link>
            )}
          </div>
        </section>

        {/* =========================================================
            SUMMARY CARDS
        ========================================================== */}
        <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* Total Wastage */}
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl shadow-black/10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  Total Wastage
                </p>

                <p className="mt-3 text-4xl font-bold tracking-tight text-white">
                  {totalWastage}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  units in current filter
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
                <span className="text-lg">
                  ↘
                </span>
              </div>
            </div>
          </div>

          {/* Records */}
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl shadow-black/10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  Wastage Records
                </p>

                <p className="mt-3 text-4xl font-bold tracking-tight text-white">
                  {filteredMovements.length}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  recorded movements
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <span className="text-lg">
                  #
                </span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl shadow-black/10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">
                  Items Affected
                </p>

                <p className="mt-3 text-4xl font-bold tracking-tight text-white">
                  {affectedItems}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  unique inventory items
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                <span className="text-lg">
                  ◈
                </span>
              </div>
            </div>
          </div>

          {/* Latest */}
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl shadow-black/10">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-400">
                  Latest Wastage
                </p>

                <p className="mt-3 text-xl font-bold text-white">
                  {latestWastage
                    ? new Date(
                        latestWastage.created_at,
                      ).toLocaleDateString()
                    : "—"}
                </p>

                <p className="mt-2 truncate text-xs text-slate-500">
                  {latestWastage
                    ? latestWastage.item_name
                    : "No records"}
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400">
                <span className="text-lg">
                  ◷
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            FILTERS
        ========================================================== */}
        <section className="mb-6 rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl shadow-black/10">
          <div className="mb-5 flex flex-col gap-1">
            <h2 className="text-base font-semibold text-white">
              Filter Wastage Records
            </h2>

            <p className="text-sm text-slate-500">
              Search and narrow the wastage history.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">

            {/* Search */}
            <div>
              <label
                htmlFor="wastage-search"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Search
              </label>

              <input
                id="wastage-search"
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Item, SKU, lot or reason"
                className="w-full rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="wastage-location"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Location
              </label>

              <select
                id="wastage-location"
                value={locationFilter}
                onChange={(event) =>
                  setLocationFilter(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">
                  All locations
                </option>

                {locationOptions.map(
                  (location) => (
                    <option
                      key={location}
                      value={location}
                    >
                      {location}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* Date */}
            <div>
              <label
                htmlFor="wastage-date"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Date Range
              </label>

              <select
                id="wastage-date"
                value={dateFilter}
                onChange={(event) =>
                  setDateFilter(
                    event.target
                      .value as DateFilter,
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-[#020617] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">
                  All time
                </option>

                <option value="7">
                  Last 7 days
                </option>

                <option value="30">
                  Last 30 days
                </option>

                <option value="90">
                  Last 90 days
                </option>
              </select>
            </div>
          </div>

          {/* Active filter summary */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-300">
                {filteredMovements.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-300">
                {movements.length}
              </span>{" "}
              wastage records
            </p>

            {(search ||
              locationFilter ||
              dateFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setLocationFilter("");
                  setDateFilter("all");
                }}
                className="text-xs font-medium text-blue-400 transition hover:text-blue-300"
              >
                Clear filters
              </button>
            )}
          </div>
        </section>

        {/* =========================================================
            TABLE
        ========================================================== */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0f172a] shadow-xl shadow-black/10">

          {/* Table header */}
          <div className="flex flex-col gap-1 border-b border-slate-800 px-5 py-5 sm:px-6">
            <h2 className="text-base font-semibold text-white">
              Wastage History
            </h2>

            <p className="text-sm text-slate-500">
              Recorded inventory wastage movements.
            </p>
          </div>

          {filteredMovements.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-500">
                ∅
              </div>

              <p className="mt-5 text-base font-semibold text-white">
                No wastage records found
              </p>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Try changing your filters or
                record a new wastage movement.
              </p>

              {(user.role === "admin" ||
                user.role === "staff") && (
                <Link
                  href="/stock-operations?operation=wastage"
                  className="mt-5 inline-flex rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Record Wastage
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left text-sm">

                <thead className="border-b border-slate-800 bg-[#0b1220]">
                  <tr>
                    <th className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Item
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      SKU
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Lot
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Location
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Quantity
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Reason
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Recorded By
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/80">
                  {filteredMovements.map(
                    (movement) => (
                      <tr
                        key={movement.id}
                        className="group transition hover:bg-slate-800/40"
                      >
                        {/* Date */}
                        <td className="whitespace-nowrap px-5 py-4 align-top">
                          <p className="font-medium text-slate-200">
                            {new Date(
                              movement.created_at,
                            ).toLocaleDateString()}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(
                              movement.created_at,
                            ).toLocaleTimeString()}
                          </p>
                        </td>

                        {/* Item */}
                        <td className="px-5 py-4 align-top">
                          <p className="font-semibold text-white">
                            {movement.item_name}
                          </p>
                        </td>

                        {/* SKU */}
                        <td className="px-5 py-4 align-top">
                          <span className="inline-flex rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs text-slate-300">
                            {movement.sku}
                          </span>
                        </td>

                        {/* Lot */}
                        <td className="px-5 py-4 align-top">
                          {movement.lot_number ? (
                            <span className="inline-flex rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs text-slate-300">
                              {movement.lot_number}
                            </span>
                          ) : (
                            <span className="text-slate-600">
                              —
                            </span>
                          )}
                        </td>

                        {/* Location */}
                        <td className="px-5 py-4 align-top">
                          <span className="text-slate-300">
                            {movement.location_name}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className="px-5 py-4 text-right align-top">
                          <span className="inline-flex min-w-[48px] justify-center rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 font-bold text-red-300">
                            -{movement.quantity}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="max-w-[280px] px-5 py-4 align-top">
                          <p
                            className="leading-5 text-slate-300"
                            title={
                              movement.reason ??
                              undefined
                            }
                          >
                            {movement.reason ??
                              "No reason provided"}
                          </p>
                        </td>

                        {/* Recorded By */}
                        <td className="px-5 py-4 align-top">
                          <p className="font-medium text-slate-300">
                            {movement.performed_by_name ??
                              "Unknown"}
                          </p>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {filteredMovements.length > 0 && (
            <div className="border-t border-slate-800 bg-[#0b1220] px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {filteredMovements.length}{" "}
                  record
                  {filteredMovements.length ===
                  1
                    ? ""
                    : "s"}{" "}
                  displayed
                </span>

                <span>
                  Total filtered wastage:{" "}
                  <span className="font-semibold text-red-300">
                    {totalWastage} units
                  </span>
                </span>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}