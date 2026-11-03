"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Package,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Truck,
  X,
  Zap,
} from "lucide-react";

import { getCurrentUser, type CurrentUser } from "../lib/auth";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "../lib/dashboard";
import {
  getLowStockItems,
  type LowStockItem,
} from "../lib/low-stock";
import {
  getReorderSuggestion,
  type ReorderSuggestion,
} from "../lib/reorder";
import {
  getProcurementSummary,
  type ProcurementSummary,
} from "../lib/procurement";

const procurementStatuses = [
  { key: "draft", label: "Draft" },
  { key: "pending_approval", label: "Pending approval" },
  { key: "approved", label: "Approved" },
  { key: "ordered", label: "Ordered" },
  { key: "received", label: "Received" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export default function DashboardPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [procurement, setProcurement] =
    useState<ProcurementSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [procurementError, setProcurementError] = useState("");

  const [suggestion, setSuggestion] =
    useState<ReorderSuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] =
    useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    setProcurementError("");

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      const organizationId = currentUser.organization_id;

      const [dashboard, lowStock, procurementSummary] =
        await Promise.all([
          getDashboardSummary(organizationId),
          getLowStockItems(organizationId),
          getProcurementSummary(organizationId),
        ]);

      setSummary(dashboard);
      setLowStockItems(lowStock);
      setProcurement(procurementSummary);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleReorderSuggestion(itemId: string) {
    if (!user?.organization_id) {
      setSuggestionError("Your organization information is unavailable.");
      return;
    }

    setSuggestionLoading(itemId);
    setSuggestionError("");
    setSuggestion(null);

    try {
      const result = await getReorderSuggestion(
        user.organization_id,
        itemId,
      );
      setSuggestion(result);
    } catch (err) {
      setSuggestionError(
        err instanceof Error
          ? err.message
          : "Unable to get a reorder suggestion.",
      );
    } finally {
      setSuggestionLoading(null);
    }
  }

  const totalItems = summary?.total_items ?? 0;
  const availableUnits = summary?.total_available_units ?? 0;
  const lowStockCount = summary?.low_stock_count ?? 0;
  const outOfStockCount = summary?.out_of_stock_count ?? 0;
  const pendingReorders = summary?.pending_reorder_count ?? 0;

  const healthyItems = Math.max(
    0,
    totalItems - lowStockCount - outOfStockCount,
  );

  const inventoryHealth =
    totalItems > 0
      ? Math.round((healthyItems / totalItems) * 100)
      : 0;

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1800px] space-y-8 px-4 pb-10 sm:px-6 lg:px-8">
      {/* Welcome banner */}
      <section className="glass-panel soft-grid relative isolate overflow-hidden p-5 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute -right-20 -top-28 -z-10 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-1/3 -z-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="grid min-w-0 grid-cols-1 items-center gap-8 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-violet-200">
              <Sparkles size={14} className="shrink-0" />
              STOCKPULSE INTELLIGENCE
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl xl:text-5xl">
              Your inventory,{" "}
              <span className="gradient-text">in focus.</span>
            </h1>

            <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-slate-300 sm:text-base">
              Welcome back{user ? `, ${user.email}` : ""}. Monitor stock
              levels, spot potential shortages, and keep your operations
              moving.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200">
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
                Dashboard online
              </span>

              {user?.role && (
                <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300">
                  Access level: {user.role}
                </span>
              )}
            </div>
          </div>

          <div className="gradient-glow flex w-full min-w-0 items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-5 sm:w-auto xl:min-w-[280px]">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-400/20 text-cyan-200">
              <Activity size={28} />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-slate-400">Inventory health</p>
              <p className="mt-1 text-3xl font-bold text-white">
                {loading ? "—" : `${inventoryHealth}%`}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Based on current stock counts
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard error */}
      {error && (
        <div
          role="alert"
          className="flex min-w-0 items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-200"
        >
          <AlertTriangle
            className="mt-0.5 shrink-0"
            size={18}
          />
          <div className="min-w-0">
            <p className="font-semibold">
              Dashboard data could not be loaded
            </p>
            <p className="mt-1 break-words">{error}</p>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-300/20 px-3 py-2 text-xs font-semibold transition hover:bg-rose-400/10"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        </div>
      )}

      {/* KPI overview */}
      <section className="min-w-0">
        <SectionHeading
          eyebrow="LIVE OVERVIEW"
          title="Inventory at a glance"
          description="A real-time snapshot of your stock position."
        />

        <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <DashboardCard
            title="Total items"
            value={totalItems}
            detail="Items tracked"
            icon={<Boxes size={20} />}
            accent="violet"
            loading={loading}
          />

          <DashboardCard
            title="Available units"
            value={availableUnits}
            detail="Units in stock"
            icon={<Package size={20} />}
            accent="cyan"
            loading={loading}
          />

          <DashboardCard
            title="Low stock"
            value={lowStockCount}
            detail="Need attention"
            icon={<ArrowDownRight size={20} />}
            accent="amber"
            loading={loading}
          />

          <DashboardCard
            title="Out of stock"
            value={outOfStockCount}
            detail="No available units"
            icon={<ShieldAlert size={20} />}
            accent="rose"
            loading={loading}
          />

          <DashboardCard
            title="Pending reorders"
            value={pendingReorders}
            detail="Awaiting replenishment"
            icon={<Truck size={20} />}
            accent="blue"
            loading={loading}
          />
        </div>
      </section>

      {/* Procurement activity */}
      <section className="glass-panel min-w-0 overflow-hidden">
        <div className="flex min-w-0 flex-col gap-4 border-b border-white/[0.08] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <SectionHeading
            eyebrow="PROCUREMENT"
            title="Purchase order activity"
            description="Track purchase orders across their current statuses."
          />

          <div className="flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-xl border border-cyan-300/15 bg-cyan-400/10 text-cyan-200 sm:self-center">
            <ClipboardList size={21} />
          </div>
        </div>

        {procurementError ? (
          <div className="break-words p-6 text-sm text-amber-200">
            {procurementError}
          </div>
        ) : procurement ? (
          <div className="min-w-0 p-5 sm:p-6">
            <div className="mb-5 rounded-2xl border border-violet-300/15 bg-gradient-to-r from-violet-500/10 to-cyan-400/5 p-5 sm:p-6">
              <p className="text-sm text-slate-400">
                Total purchase orders
              </p>
              <p className="mt-2 text-4xl font-bold text-white">
                {procurement.total.toLocaleString()}
              </p>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {procurementStatuses.map((status) => (
                <ProcurementCard
                  key={status.key}
                  label={status.label}
                  value={procurement[status.key]}
                  status={status.key}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 text-sm text-slate-400">
            {loading
              ? "Loading procurement activity…"
              : "No procurement data available."}
          </div>
        )}
      </section>

      {/* Low-stock table */}
      <section className="glass-panel min-w-0 overflow-hidden">
        <div className="flex min-w-0 flex-col gap-4 border-b border-white/[0.08] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <SectionHeading
            eyebrow="STOCK WATCH"
            title="Items needing attention"
            description="Review shortages and request a reorder suggestion."
          />

          <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">
            <AlertTriangle size={15} />
            {lowStockItems.length} items listed
          </span>
        </div>

        {loading ? (
          <div className="space-y-3 p-5 sm:p-6">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse rounded-xl bg-white/[0.04]"
              />
            ))}
          </div>
        ) : lowStockItems.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-200">
              <CheckCircle2 size={27} />
            </div>

            <h3 className="mt-4 font-semibold text-white">
              No low-stock items
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              There are no items in the low-stock list right now.
            </p>
          </div>
        ) : (
          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.025]">
                  <TableHeader>Item</TableHeader>
                  <TableHeader>SKU</TableHeader>
                  <TableHeader>Available</TableHeader>
                  <TableHeader>Reorder point</TableHeader>
                  <TableHeader>Shortage</TableHeader>
                  <TableHeader>Suggested qty.</TableHeader>
                  <TableHeader>Action</TableHeader>
                </tr>
              </thead>

              <tbody>
                {lowStockItems.map((item) => (
                  <tr
                    key={item.item_id}
                    className="border-b border-white/[0.055] transition-colors hover:bg-violet-400/[0.045]"
                  >
                    <td className="max-w-[240px] px-5 py-4">
                      <p className="break-words font-medium text-white">
                        {item.name}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        ID: {item.item_id}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-300">
                      {item.sku}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="font-semibold text-amber-200">
                        {item.available_quantity}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-300">
                      {item.reorder_point}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-rose-200">
                      {item.shortage_quantity}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-cyan-200">
                      {item.reorder_quantity}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          void handleReorderSuggestion(item.item_id)
                        }
                        disabled={
                          suggestionLoading === item.item_id
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-400/10 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:border-violet-300/40 hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {suggestionLoading === item.item_id ? (
                          <RefreshCw
                            size={14}
                            className="animate-spin"
                          />
                        ) : (
                          <Zap size={14} />
                        )}

                        {suggestionLoading === item.item_id
                          ? "Calculating"
                          : "Get suggestion"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Reorder errors */}
      {suggestionError && (
        <div
          role="alert"
          className="flex min-w-0 items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-200"
        >
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0"
          />
          <p className="min-w-0 break-words">{suggestionError}</p>
        </div>
      )}

      {/* Reorder suggestion */}
      {suggestion && (
        <section className="glass-panel relative min-w-0 overflow-hidden p-5 sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0">
              <SectionHeading
                eyebrow="REORDER INTELLIGENCE"
                title="Reorder suggestion"
                description="Review the returned recommendation before taking action."
              />
            </div>

            <button
              type="button"
              aria-label="Close reorder suggestion"
              onClick={() => setSuggestion(null)}
              className="shrink-0 rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="relative mt-5 min-w-0">
            <SuggestionCard suggestion={suggestion} />
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="flex min-w-0 flex-col gap-2 border-t border-white/[0.07] pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
          StockPulse Inventory Intelligence
        </span>

        <span className="leading-5">
          Live data is provided by your connected backend.
        </span>
      </footer>
    </main>
  );
}

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

function DashboardCard({
  title,
  value,
  detail,
  icon,
  accent,
  loading,
}: {
  title: string;
  value: number;
  detail: string;
  icon: ReactNode;
  accent: "violet" | "cyan" | "amber" | "rose" | "blue";
  loading: boolean;
}) {
  const accents = {
    violet: {
      icon: "border-violet-300/20 bg-violet-400/10 text-violet-200",
      glow: "from-violet-500/[0.10]",
      value: "text-violet-100",
    },
    cyan: {
      icon: "border-cyan-300/20 bg-cyan-400/10 text-cyan-200",
      glow: "from-cyan-500/[0.10]",
      value: "text-cyan-100",
    },
    amber: {
      icon: "border-amber-300/20 bg-amber-400/10 text-amber-200",
      glow: "from-amber-500/[0.09]",
      value: "text-amber-100",
    },
    rose: {
      icon: "border-rose-300/20 bg-rose-400/10 text-rose-200",
      glow: "from-rose-500/[0.09]",
      value: "text-rose-100",
    },
    blue: {
      icon: "border-blue-300/20 bg-blue-400/10 text-blue-200",
      glow: "from-blue-500/[0.10]",
      value: "text-blue-100",
    },
  };

  const style = accents[accent];

  return (
    <div
      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br ${style.glow} to-slate-950/30 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.16]`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 break-words text-sm text-slate-400">
          {title}
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

      <div className="mt-auto flex items-center gap-2 pt-3 text-xs text-slate-500">
        <ArrowUpRight size={14} className="shrink-0" />
        <span className="break-words">{detail}</span>
      </div>
    </div>
  );
}

function ProcurementCard({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: string;
}) {
  const statusStyles: Record<string, string> = {
    draft: "bg-slate-400",
    pending_approval: "bg-amber-300",
    approved: "bg-cyan-300",
    ordered: "bg-violet-300",
    received: "bg-emerald-300",
    cancelled: "bg-rose-300",
  };

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-white/[0.14] hover:bg-white/[0.04]">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusStyles[status] ?? "bg-slate-400"}`}
        />

        <span className="break-words text-sm text-slate-300">
          {label}
        </span>
      </div>

      <span className="shrink-0 text-lg font-semibold tabular-nums text-white">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function SuggestionCard({
  suggestion,
}: {
  suggestion: ReorderSuggestion;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-cyan-300/15 bg-slate-950/35 p-4 sm:p-5">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
              <Package size={20} />
            </div>

            <div className="min-w-0">
              <h3 className="break-words font-semibold text-white">
                {suggestion.name}
              </h3>

              <p className="mt-1 break-all text-xs text-slate-400">
                SKU: {suggestion.sku}
              </p>
            </div>
          </div>
        </div>

        <span
          className={`inline-flex w-fit max-w-full shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            suggestion.is_low_stock
              ? "border-amber-300/20 bg-amber-400/10 text-amber-200"
              : "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
          }`}
        >
          {suggestion.is_low_stock ? (
            <AlertTriangle size={14} className="shrink-0" />
          ) : (
            <CheckCircle2 size={14} className="shrink-0" />
          )}

          {suggestion.is_low_stock ? "Low stock" : "Stock status OK"}
        </span>
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SuggestionMetric
          label="Available quantity"
          value={suggestion.available_quantity}
        />

        <SuggestionMetric
          label="Reorder point"
          value={suggestion.reorder_point}
        />

        <SuggestionMetric
          label="Suggested quantity"
          value={suggestion.suggested_quantity}
          highlight
        />

        <SuggestionMetric
          label="Lead time"
          value={`${suggestion.lead_time_days} days`}
        />
      </div>

      <div className="mt-4 flex min-w-0 items-start gap-2 text-xs leading-5 text-slate-400">
        <Activity
          size={15}
          className="mt-0.5 shrink-0 text-cyan-300"
        />

        <p className="min-w-0">
          This is a recommendation. Review the quantity and your operational
          requirements before placing a purchase order.
        </p>
      </div>
    </div>
  );
}

function SuggestionMetric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border p-4 ${
        highlight
          ? "border-cyan-300/20 bg-cyan-400/[0.07]"
          : "border-white/[0.07] bg-white/[0.025]"
      }`}
    >
      <p className="break-words text-xs text-slate-400">{label}</p>

      <p
        className={`mt-2 break-words text-xl font-semibold ${
          highlight ? "text-cyan-200" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TableHeader({ children }: { children: ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
      {children}
    </th>
  );
}