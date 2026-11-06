"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";

import { getCurrentUser, type CurrentUser } from "../lib/auth";
import {
  getInventory,
  type InventoryListItem,
} from "../lib/inventory";

type ExpiryStatus = "expired" | "soon" | "normal" | "none";

export default function InventoryPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [inventory, setInventory] = useState<InventoryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");

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
          : "Failed to load inventory.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

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

  const filteredInventory = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return inventory;

    return inventory.filter((item) => {
      return [
        item.item_name,
        item.sku,
        item.location_name,
        item.lot_number,
        item.expiry_date ?? "",
      ].some((value) =>
        String(value).toLowerCase().includes(query),
      );
    });
  }, [inventory, search]);

  const expiredCount = useMemo(
    () =>
      inventory.filter(
        (item) => getExpiryStatus(item.expiry_date) === "expired",
      ).length,
    [inventory],
  );

  const soonCount = useMemo(
    () =>
      inventory.filter(
        (item) => getExpiryStatus(item.expiry_date) === "soon",
      ).length,
    [inventory],
  );

  const outOfStockCount = useMemo(
    () =>
      inventory.filter((item) => item.available_quantity <= 0).length,
    [inventory],
  );

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1800px] space-y-8 px-4 pb-10 pt-2 sm:px-6 lg:px-8">
      {/* Page header */}
      <section className="glass-panel soft-grid relative isolate overflow-hidden p-5 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute -right-20 -top-28 -z-10 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-1/3 -z-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="flex min-w-0 flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-violet-200">
              <Sparkles size={14} />
              STOCKPULSE INTELLIGENCE
            </div>

            <h1 className="break-words text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Inventory{" "}
              <span className="gradient-text">Control Center</span>
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Monitor physical stock across items, locations, and batches.
              Track available quantities and keep your inventory organized.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
                Inventory monitoring active
              </span>

              {user && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">
                  {user.role}
                </span>
              )}
            </div>
          </div>

          <div className="flex w-full min-w-0 items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:p-5 xl:w-auto xl:min-w-[250px]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
              <Boxes size={27} />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-slate-400">Inventory lots</p>
              <p className="mt-1 text-3xl font-bold text-white">
                {loading ? "—" : inventory.length.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Across your organization
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="flex min-w-0 items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-200"
        >
          <AlertTriangle size={19} className="mt-0.5 shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Inventory could not be loaded
            </p>
            <p className="mt-1 break-words">{error}</p>

            <button
              type="button"
              onClick={() => void loadInventory()}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-300/20 px-3 py-2 text-xs font-semibold transition hover:bg-rose-400/10"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Inventory overview */}
      <section className="min-w-0">
        <SectionHeading
          eyebrow="INVENTORY OVERVIEW"
          title="Stock at a glance"
          description="A consolidated view of your physical inventory quantities."
        />

        <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Inventory lots"
            value={inventory.length}
            detail="Tracked stock lots"
            accent="violet"
            icon={<Boxes size={21} />}
            loading={loading}
          />

          <SummaryCard
            label="Units on hand"
            value={totals.onHand}
            detail="Total physical quantity"
            accent="blue"
            icon={<Package size={21} />}
            loading={loading}
          />

          <SummaryCard
            label="Reserved units"
            value={totals.reserved}
            detail="Quantity reserved"
            accent="amber"
            icon={<Clock3 size={21} />}
            loading={loading}
          />

          <SummaryCard
            label="Available units"
            value={totals.available}
            detail="Quantity available"
            accent="emerald"
            icon={<CheckCircle2 size={21} />}
            loading={loading}
          />
        </div>
      </section>

      {/* Stock alerts */}
      <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
        <AlertCard
          label="Out of stock lots"
          value={outOfStockCount}
          description="No available quantity"
          icon={<ShieldAlert size={19} />}
          accent="rose"
          loading={loading}
        />

        <AlertCard
          label="Expired lots"
          value={expiredCount}
          description="Expiry date has passed"
          icon={<XCircle size={19} />}
          accent="rose"
          loading={loading}
        />

        <AlertCard
          label="Expiring within 30 days"
          value={soonCount}
          description="Check upcoming expiry dates"
          icon={<CalendarClock size={19} />}
          accent="amber"
          loading={loading}
        />
      </section>

      {/* Inventory table */}
      <section className="glass-panel min-w-0 overflow-hidden">
        <div className="flex min-w-0 flex-col gap-5 border-b border-white/[0.08] p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <SectionHeading
            eyebrow="STOCK REGISTER"
            title="Current inventory"
            description="Physical stock by item, location, and batch."
          />

          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row xl:w-auto">
            <div className="relative min-w-0 flex-1 xl:w-[320px] xl:flex-none">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search item, SKU, lot, location..."
                aria-label="Search inventory"
                className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-10 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10"
              />

              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
                >
                  <XCircle size={17} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => void loadInventory()}
              disabled={loading}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-400/10 px-4 text-sm font-semibold text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Table information */}
        <div className="flex min-w-0 flex-col gap-2 border-b border-white/[0.06] bg-white/[0.02] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-slate-400">
            Showing{" "}
            <span className="font-semibold text-white">
              {loading ? "—" : filteredInventory.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-white">
              {loading ? "—" : inventory.length}
            </span>{" "}
            inventory lots
          </p>

          <p className="text-xs text-slate-500">
            Quantities are based on your inventory records.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3 p-5 sm:p-6">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="h-14 animate-pulse rounded-xl bg-white/[0.04]"
              />
            ))}
          </div>
        ) : inventory.length === 0 ? (
          <EmptyState
            title="No inventory records found"
            description="There are currently no inventory lots for this organization."
            icon={<Package size={28} />}
          />
        ) : filteredInventory.length === 0 ? (
          <EmptyState
            title="No matching inventory"
            description="Try a different search term or clear the search field."
            icon={<Search size={27} />}
            action={
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
              >
                Clear search
              </button>
            }
          />
        ) : (
          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-slate-950/60">
                  <TableHeader>Item</TableHeader>
                  <TableHeader>SKU</TableHeader>
                  <TableHeader>Location</TableHeader>
                  <TableHeader>Lot number</TableHeader>
                  <TableHeader>Expiry</TableHeader>
                  <TableHeader>On hand</TableHeader>
                  <TableHeader>Reserved</TableHeader>
                  <TableHeader>Available</TableHeader>
                </tr>
              </thead>

              <tbody>
                {filteredInventory.map((item) => {
                  const expiryStatus = getExpiryStatus(item.expiry_date);

                  return (
                    <tr
                      key={item.inventory_lot_id}
                      className="border-b border-white/[0.055] transition-colors hover:bg-violet-400/[0.045]"
                    >
                      <td className="max-w-[240px] px-5 py-4">
                        <p className="break-words font-semibold text-white">
                          {item.item_name}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="font-mono text-xs text-cyan-200">
                          {item.sku}
                        </span>
                      </td>

                      <td className="max-w-[200px] px-5 py-4">
                        <span className="break-words text-slate-300">
                          {item.location_name}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-xs text-slate-300">
                          {item.lot_number}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <ExpiryBadge
                          date={item.expiry_date}
                          status={expiryStatus}
                        />
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="font-semibold tabular-nums text-white">
                          {item.quantity_on_hand.toLocaleString()}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={
                            item.reserved_quantity > 0
                              ? "font-semibold tabular-nums text-amber-200"
                              : "text-slate-500"
                          }
                        >
                          {item.reserved_quantity.toLocaleString()}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex min-w-12 items-center justify-center rounded-full border px-3 py-1 text-xs font-bold tabular-nums ${
                            item.available_quantity <= 0
                              ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
                              : "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
                          }`}
                        >
                          {item.available_quantity.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Inventory totals footer */}
        {!loading && inventory.length > 0 && (
          <div className="flex min-w-0 flex-col gap-3 border-t border-white/[0.07] bg-slate-950/40 px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
              <FooterTotal
                label="On hand"
                value={totals.onHand}
                color="text-white"
              />

              <FooterTotal
                label="Reserved"
                value={totals.reserved}
                color="text-amber-200"
              />

              <FooterTotal
                label="Available"
                value={totals.available}
                color="text-emerald-200"
              />
            </div>

            <p className="text-xs text-slate-500">
              {search
                ? "Summary totals include all inventory lots."
                : "All organization inventory lots."}
            </p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="flex min-w-0 flex-col gap-2 border-t border-white/[0.07] pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
          StockPulse Inventory Intelligence
        </span>

        <span>Inventory data provided by your connected backend.</span>
      </footer>
    </main>
  );
}

/* ------------------------------------------
   Reusable section heading
------------------------------------------- */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">
        {eyebrow}
      </p>

      <h2 className="mt-2 break-words text-lg font-semibold tracking-tight text-white sm:text-xl">
        {title}
      </h2>

      <p className="mt-1 break-words text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}

/* ------------------------------------------
   Inventory summary cards
------------------------------------------- */

function SummaryCard({
  label,
  value,
  detail,
  accent,
  icon,
  loading,
}: {
  label: string;
  value: number;
  detail: string;
  accent: "violet" | "blue" | "amber" | "emerald";
  icon: ReactNode;
  loading: boolean;
}) {
  const styles = {
    violet: {
      icon: "border-violet-300/20 bg-violet-400/10 text-violet-200",
      glow: "from-violet-500/[0.10]",
      value: "text-violet-100",
    },
    blue: {
      icon: "border-blue-300/20 bg-blue-400/10 text-blue-200",
      glow: "from-blue-500/[0.10]",
      value: "text-blue-100",
    },
    amber: {
      icon: "border-amber-300/20 bg-amber-400/10 text-amber-200",
      glow: "from-amber-500/[0.10]",
      value: "text-amber-100",
    },
    emerald: {
      icon: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
      glow: "from-emerald-500/[0.10]",
      value: "text-emerald-100",
    },
  };

  const style = styles[accent];

  return (
    <div
      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br ${style.glow} to-slate-950/30 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.16]`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 break-words text-sm text-slate-400">
          {label}
        </p>

        <div
          className={`shrink-0 rounded-xl border p-2.5 ${style.icon}`}
        >
          {icon}
        </div>
      </div>

      <p className={`mt-5 text-3xl font-bold tracking-tight ${style.value}`}>
        {loading ? (
          <span className="inline-block h-9 w-16 animate-pulse rounded-lg bg-white/10" />
        ) : (
          value.toLocaleString()
        )}
      </p>

      <p className="mt-auto pt-3 text-xs text-slate-500">
        {detail}
      </p>
    </div>
  );
}

/* ------------------------------------------
   Inventory alert cards
------------------------------------------- */

function AlertCard({
  label,
  value,
  description,
  icon,
  accent,
  loading,
}: {
  label: string;
  value: number;
  description: string;
  icon: ReactNode;
  accent: "rose" | "amber";
  loading: boolean;
}) {
  const styles = {
    rose: {
      icon: "border-rose-300/20 bg-rose-400/10 text-rose-200",
      value: "text-rose-200",
      border: "border-rose-300/15",
    },
    amber: {
      icon: "border-amber-300/20 bg-amber-400/10 text-amber-200",
      value: "text-amber-200",
      border: "border-amber-300/15",
    },
  };

  const style = styles[accent];

  return (
    <div
      className={`flex min-w-0 items-center gap-4 rounded-2xl border ${style.border} bg-slate-950/30 p-4 transition hover:bg-white/[0.035] sm:p-5`}
    >
      <div className={`shrink-0 rounded-xl border p-3 ${style.icon}`}>
        {icon}
      </div>

      <div className="min-w-0">
        <p className="break-words text-sm font-medium text-slate-300">
          {label}
        </p>

        <p className={`mt-1 text-2xl font-bold ${style.value}`}>
          {loading ? "—" : value.toLocaleString()}
        </p>

        <p className="mt-1 break-words text-xs text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------
   Expiry status helpers
------------------------------------------- */

function getExpiryStatus(
  expiryDate: string | null | undefined,
): ExpiryStatus {
  if (!expiryDate) return "none";

  const expiry = new Date(`${expiryDate}T00:00:00`);

  if (Number.isNaN(expiry.getTime())) return "none";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const difference = expiry.getTime() - today.getTime();
  const daysRemaining = Math.ceil(
    difference / (1000 * 60 * 60 * 24),
  );

  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= 30) return "soon";

  return "normal";
}

function ExpiryBadge({
  date,
  status,
}: {
  date: string | null | undefined;
  status: ExpiryStatus;
}) {
  if (!date) {
    return <span className="text-slate-500">—</span>;
  }

  const styles: Record<ExpiryStatus, string> = {
    expired:
      "border-rose-300/20 bg-rose-400/10 text-rose-200",
    soon:
      "border-amber-300/20 bg-amber-400/10 text-amber-200",
    normal:
      "border-emerald-300/15 bg-emerald-400/[0.07] text-emerald-200",
    none: "border-white/10 bg-white/[0.04] text-slate-400",
  };

  const labels: Record<ExpiryStatus, string> = {
    expired: "Expired",
    soon: "Expiring soon",
    normal: "Valid",
    none: "No expiry",
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="whitespace-nowrap text-xs text-slate-300">
        {date}
      </span>

      <span
        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles[status]}`}
      >
        {labels[status]}
      </span>
    </div>
  );
}

/* ------------------------------------------
   Empty state
------------------------------------------- */

function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
        {icon}
      </div>

      <h3 className="mt-4 break-words font-semibold text-white">
        {title}
      </h3>

      <p className="mt-2 max-w-md break-words text-sm leading-6 text-slate-400">
        {description}
      </p>

      {action}
    </div>
  );
}

/* ------------------------------------------
   Table components
------------------------------------------- */

function TableHeader({ children }: { children: ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
      {children}
    </th>
  );
}

function FooterTotal({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-slate-500">{label}:</span>
      <strong className={`font-semibold tabular-nums ${color}`}>
        {value.toLocaleString()}
      </strong>
    </span>
  );
}