"use client";

import { useEffect, useMemo, useState } from "react";
import { getCostAnalysis, type CostAnalysisResponse } from "../lib/cost-analysis";

const ORGANIZATION_ID = "addc299a-6ab4-4399-83ab-490ce15f3faa";

function formatMoney(value: string) {
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-IN");
}

export default function CostAnalysisPage() {
  const [data, setData] = useState<CostAnalysisResponse | null>(null);
  const [historyDays, setHistoryDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnalysis(days = historyDays) {
    try {
      setLoading(true);
      setError("");

      const result = await getCostAnalysis(ORGANIZATION_ID, days);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cost analysis");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalysis();
  }, []);

  const maxTrendValue = useMemo(() => {
    if (!data?.trend.length) return 1;

    return Math.max(
      ...data.trend.map((point) =>
        Math.max(
          Number(point.procurement_spend),
          Number(point.wastage_cost),
        ),
      ),
      1,
    );
  }, [data]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">
              Financial Intelligence
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Cost Analysis
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Monitor procurement spending, estimated wastage cost, and current
              inventory value.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={historyDays}
              onChange={(event) => {
                const days = Number(event.target.value);
                setHistoryDays(days);
                loadAnalysis(days);
              }}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
              <option value={365}>Last 365 days</option>
            </select>

            <button
              type="button"
              onClick={() => loadAnalysis()}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            Loading cost analysis...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-900 bg-red-950/40 p-6">
            <p className="font-semibold text-red-300">
              Failed to load cost analysis
            </p>

            <p className="mt-2 text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">
                  Procurement Spend
                </p>

                <p className="mt-3 text-2xl font-bold text-cyan-300">
                  {formatMoney(data.procurement_spend)}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Recorded purchase cost
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">
                  Estimated Wastage Cost
                </p>

                <p className="mt-3 text-2xl font-bold text-red-300">
                  {formatMoney(data.estimated_wastage_cost)}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Based on latest known unit cost
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">
                  Estimated Inventory Value
                </p>

                <p className="mt-3 text-2xl font-bold text-emerald-300">
                  {formatMoney(data.estimated_inventory_value)}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Available stock valuation
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">
                  Available Units
                </p>

                <p className="mt-3 text-2xl font-bold text-white">
                  {formatNumber(data.available_units)}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  After reserved quantity
                </p>
              </div>
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Received Units</p>
                <p className="mt-2 text-xl font-bold">
                  {formatNumber(data.received_units)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Wasted Units</p>
                <p className="mt-2 text-xl font-bold text-red-300">
                  {formatNumber(data.wasted_units)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Analysis Period</p>
                <p className="mt-2 text-sm font-semibold text-slate-200">
                  {data.period_start} → {data.period_end}
                </p>
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold">
                    Cost Trend
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Daily procurement and estimated wastage cost
                  </p>
                </div>

                <div className="space-y-3">
                  {data.trend.length === 0 && (
                    <p className="text-sm text-slate-500">
                      No trend data available.
                    </p>
                  )}

                  {data.trend.map((point) => {
                    const procurement = Number(point.procurement_spend);
                    const wastage = Number(point.wastage_cost);

                    return (
                      <div key={point.date}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-slate-400">
                            {point.date}
                          </span>

                          <span className="text-slate-500">
                            {formatMoney(
                              String(procurement + wastage),
                            )}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-cyan-400"
                            style={{
                              width: `${Math.max(
                                (procurement / maxTrendValue) * 100,
                                procurement > 0 ? 2 : 0,
                              )}%`,
                            }}
                          />
                        </div>

                        {wastage > 0 && (
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-red-400"
                              style={{
                                width: `${Math.max(
                                  (wastage / maxTrendValue) * 100,
                                  2,
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex gap-5 text-xs">
                  <span className="flex items-center gap-2 text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    Procurement
                  </span>

                  <span className="flex items-center gap-2 text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-red-400" />
                    Wastage
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold">
                    Top Wastage Items
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Highest estimated cost impact
                  </p>
                </div>

                {data.top_wastage_items.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No wastage recorded for this period.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.top_wastage_items.map((item) => (
                      <div
                        key={item.item_id}
                        className="rounded-lg border border-slate-800 bg-slate-950 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-slate-200">
                              {item.item_name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.sku} · {formatNumber(item.quantity)} units
                            </p>
                          </div>

                          <p className="font-semibold text-red-300">
                            {formatMoney(item.estimated_cost)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  Inventory Cost Breakdown
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Estimated value using the latest known purchase price
                </p>
              </div>

              {data.inventory_by_item.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No available inventory found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Quantity</th>
                        <th className="px-4 py-3">Unit Cost</th>
                        <th className="px-4 py-3 text-right">
                          Estimated Value
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.inventory_by_item.map((item) => (
                        <tr
                          key={item.item_id}
                          className="border-b border-slate-800/70"
                        >
                          <td className="px-4 py-4 font-medium text-slate-200">
                            {item.item_name}
                          </td>

                          <td className="px-4 py-4 text-slate-400">
                            {item.sku}
                          </td>

                          <td className="px-4 py-4 text-slate-300">
                            {formatNumber(item.quantity)}
                          </td>

                          <td className="px-4 py-4 text-slate-300">
                            {formatMoney(item.unit_cost)}
                          </td>

                          <td className="px-4 py-4 text-right font-semibold text-emerald-300">
                            {formatMoney(item.estimated_cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="mt-6 rounded-lg border border-amber-900/60 bg-amber-950/30 p-4 text-xs leading-5 text-amber-300">
              <strong>Cost methodology:</strong> inventory value and wastage
              cost are estimates based on the latest known purchase price per
              item. They are not batch-level accounting values.
            </div>
          </>
        )}
      </div>
    </main>
  );
}