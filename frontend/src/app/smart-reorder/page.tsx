"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock3,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { getCurrentUser, type CurrentUser } from "../lib/auth";

import {
  getInventory,
  type InventoryListItem,
} from "../lib/inventory";

import {
  getSmartReorderRecommendation,
  type SmartReorderResponse,
} from "../lib/smart-reorder";

import {
  createSmartReorderPurchaseOrder,
} from "../lib/reorder-center";

import {
  getSuppliers,
  type Supplier,
} from "../lib/suppliers";

import { apiRequest } from "../lib/api";

const ORGANIZATION_ID =
  "addc299a-6ab4-4399-83ab-490ce15f3faa";

interface UsageHistoryPoint {
  date: string;
  quantity: number;
}

interface ForecastPoint {
  date: string;
  predicted_quantity: number;
}

interface ForecastResponse {
  item_id: string;
  historical_days: number;
  forecast_days: number;
  average_daily_usage: number;
  predicted_daily_usage: number;
  forecast: ForecastPoint[];
  method: string;
  confidence: string;
}

function SmartReorderContent() {
  const searchParams = useSearchParams();

  const itemIdFromUrl = searchParams.get("itemId");

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [inventory, setInventory] = useState<
    InventoryListItem[]
  >([]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [selectedItemId, setSelectedItemId] = useState("");

  const [selectedSupplierId, setSelectedSupplierId] =
    useState("");

  const [historyDays, setHistoryDays] = useState("30");
  const [forecastDays, setForecastDays] = useState("7");
  const [safetyStockDays, setSafetyStockDays] =
    useState("3");

  const [recommendation, setRecommendation] =
    useState<SmartReorderResponse | null>(null);

  const [usageHistory, setUsageHistory] =
    useState<UsageHistoryPoint[]>([]);

  const [forecast, setForecast] =
    useState<ForecastResponse | null>(null);

  const [poQuantity, setPoQuantity] = useState("");
  const [poNotes, setPoNotes] = useState("");

  const [createdPurchaseOrderId, setCreatedPurchaseOrderId] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [autoCalculate, setAutoCalculate] = useState(
    Boolean(itemIdFromUrl),
  );
  const [creatingPurchaseOrder, setCreatingPurchaseOrder] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        setError("");

        const user = await getCurrentUser();

        setCurrentUser(user);

        const [inventoryData, supplierData] =
          await Promise.all([
            getInventory(user.organization_id),
            getSuppliers(user.organization_id),
          ]);

        setInventory(inventoryData);
        setSuppliers(supplierData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load Smart Reorder data.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!itemIdFromUrl) {
      return;
    }

    if (inventory.length === 0) {
      return;
    }

    const itemExists = inventory.some(
      (item) => item.item_id === itemIdFromUrl,
    );

    if (itemExists) {
      setSelectedItemId(itemIdFromUrl);
    }
  }, [itemIdFromUrl, inventory]);

  useEffect(() => {
    if (!autoCalculate) {
      return;
    }

    if (!itemIdFromUrl) {
      return;
    }

    if (!selectedItemId) {
      return;
    }

    if (selectedItemId !== itemIdFromUrl) {
      return;
    }

    if (loading || calculating) {
      return;
    }

    setAutoCalculate(false);

    void handleCalculate();
  }, [
    autoCalculate,
    itemIdFromUrl,
    selectedItemId,
    loading,
    calculating,
  ]);

  const itemOptions = useMemo(() => {
    const uniqueItems = new Map<
      string,
      {
        item_id: string;
        sku: string;
        item_name: string;
        available_quantity: number;
      }
    >();

    for (const row of inventory) {
      const existing = uniqueItems.get(row.item_id);

      if (existing) {
        existing.available_quantity +=
          row.available_quantity;
      } else {
        uniqueItems.set(row.item_id, {
          item_id: row.item_id,
          sku: row.sku,
          item_name: row.item_name,
          available_quantity: row.available_quantity,
        });
      }
    }

    return Array.from(uniqueItems.values()).sort((a, b) =>
      a.item_name.localeCompare(b.item_name),
    );
  }, [inventory]);

  async function handleCalculate() {
    if (!selectedItemId) {
      setError("Please select an item.");
      return;
    }

    const parsedHistoryDays = Number(historyDays);
    const parsedForecastDays = Number(forecastDays);
    const parsedSafetyStockDays = Number(safetyStockDays);

    if (
      !Number.isInteger(parsedHistoryDays) ||
      parsedHistoryDays < 3 ||
      parsedHistoryDays > 365
    ) {
      setError(
        "History days must be an integer between 3 and 365.",
      );
      return;
    }

    if (
      !Number.isInteger(parsedForecastDays) ||
      parsedForecastDays < 1 ||
      parsedForecastDays > 90
    ) {
      setError(
        "Forecast days must be an integer between 1 and 90.",
      );
      return;
    }

    if (
      !Number.isInteger(parsedSafetyStockDays) ||
      parsedSafetyStockDays < 0 ||
      parsedSafetyStockDays > 90
    ) {
      setError(
        "Safety stock days must be an integer between 0 and 90.",
      );
      return;
    }

    try {
      setCalculating(true);

      setError("");
      setSuccess("");
      setRecommendation(null);
      setUsageHistory([]);
      setForecast(null);
      setCreatedPurchaseOrderId("");

      const organizationId =
        currentUser?.organization_id ?? ORGANIZATION_ID;

      const usageHistoryPath =
        `/api/v1/organizations/${organizationId}/items/${selectedItemId}/usage-history` +
        `?history_days=${parsedHistoryDays}`;

      const forecastPath =
        `/api/v1/organizations/${organizationId}/items/${selectedItemId}/forecast` +
        `?history_days=${parsedHistoryDays}` +
        `&forecast_days=${parsedForecastDays}`;

      const [
        recommendationResult,
        usageHistoryResult,
        forecastResult,
      ] = await Promise.all([
        getSmartReorderRecommendation(
          organizationId,
          selectedItemId,
          {
            historyDays: parsedHistoryDays,
            forecastDays: parsedForecastDays,
            safetyStockDays: parsedSafetyStockDays,
          },
        ),

        apiRequest<UsageHistoryPoint[]>(
          usageHistoryPath,
        ),

        apiRequest<ForecastResponse>(
          forecastPath,
        ),
      ]);

      setRecommendation(recommendationResult);
      setUsageHistory(usageHistoryResult);
      setForecast(forecastResult);

      setPoQuantity(
        String(
          recommendationResult.recommended_quantity,
        ),
      );

      setSuccess(
        "Smart reorder recommendation calculated successfully.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to calculate Smart Reorder analysis.",
      );
    } finally {
      setCalculating(false);
    }
  }

  async function handleCreatePurchaseOrder() {
    if (!recommendation) {
      setError(
        "Calculate a smart reorder recommendation first.",
      );
      return;
    }

    if (!selectedSupplierId) {
      setError("Please select a supplier.");
      return;
    }

    const parsedQuantity = Number(poQuantity);

    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setError(
        "Purchase order quantity must be a positive integer.",
      );
      return;
    }

    try {
      setCreatingPurchaseOrder(true);

      setError("");
      setSuccess("");
      setCreatedPurchaseOrderId("");

      const result =
        await createSmartReorderPurchaseOrder(
          currentUser?.organization_id ?? ORGANIZATION_ID,
          recommendation.item_id,
          {
            item_id: recommendation.item_id,
            supplier_id: selectedSupplierId,
            quantity: parsedQuantity,
            notes: poNotes.trim() || undefined,
          },
        );

      setCreatedPurchaseOrderId(
        result.purchase_order_id,
      );

      setSuccess(
        `Purchase order created successfully. Quantity: ${result.quantity} units.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create purchase order.",
      );
    } finally {
      setCreatingPurchaseOrder(false);
    }
  }

  const selectedItem = itemOptions.find(
    (item) => item.item_id === selectedItemId,
  );

  const maxUsageQuantity = useMemo(() => {
    return Math.max(
      ...usageHistory.map((point) => point.quantity),
      1,
    );
  }, [usageHistory]);

  const maxForecastQuantity = useMemo(() => {
    return Math.max(
      ...(forecast?.forecast.map(
        (point) => point.predicted_quantity,
      ) ?? []),
      1,
    );
  }, [forecast]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-32">
          <div className="flex items-center gap-3 text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            Loading Smart Reorder...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-400">
                <Sparkles className="h-4 w-4" />
                StockPulse Intelligence
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white">
                Smart Reorder
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Use historical stock usage and demand
                forecasting to calculate a data-driven
                reorder recommendation.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/reorder-center"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <ShoppingCart className="h-4 w-4" />
                Reorder Center
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
              >
                Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Alerts */}
        {error && (
          <section className="rounded-2xl border border-red-500/30 bg-red-950/40 px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />

              <div>
                <p className="font-semibold text-red-300">
                  Smart Reorder error
                </p>

                <p className="mt-1 text-sm text-red-200">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        {success && (
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-5 py-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

              <div>
                <p className="font-semibold text-emerald-300">
                  Operation successful
                </p>

                <p className="mt-1 text-sm text-emerald-200">
                  {success}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Configuration */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/40 p-3">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">
                Forecast Configuration
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select an item and configure the forecasting
                window used by the recommendation engine.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <DarkLabel
                htmlFor="item"
                text="Item"
              />

              <select
                id="item"
                value={selectedItemId}
                onChange={(event) => {
                  setSelectedItemId(event.target.value);

                  setAutoCalculate(false);

                  setRecommendation(null);
                  setUsageHistory([]);
                  setForecast(null);
                  setCreatedPurchaseOrderId("");
                  setPoQuantity("");
                  setSuccess("");
                  setError("");
                }}
                className={inputClassName}
              >
                <option value="">Select an item</option>

                {itemOptions.map((item) => (
                  <option
                    key={item.item_id}
                    value={item.item_id}
                  >
                    {item.sku} — {item.item_name}
                  </option>
                ))}
              </select>

              {selectedItem && (
                <p className="mt-2 text-xs text-slate-500">
                  Current available inventory:{" "}
                  <span className="font-bold text-cyan-300">
                    {selectedItem.available_quantity}
                  </span>{" "}
                  units
                </p>
              )}
            </div>

            <div>
              <DarkLabel
                htmlFor="history-days"
                text="History Days"
              />

              <input
                id="history-days"
                type="number"
                min="3"
                max="365"
                value={historyDays}
                onChange={(event) =>
                  setHistoryDays(event.target.value)
                }
                className={inputClassName}
              />

              <p className="mt-2 text-xs text-slate-500">
                3–365 days
              </p>
            </div>

            <div>
              <DarkLabel
                htmlFor="forecast-days"
                text="Forecast Days"
              />

              <input
                id="forecast-days"
                type="number"
                min="1"
                max="90"
                value={forecastDays}
                onChange={(event) =>
                  setForecastDays(event.target.value)
                }
                className={inputClassName}
              />

              <p className="mt-2 text-xs text-slate-500">
                1–90 days
              </p>
            </div>

            <div>
              <DarkLabel
                htmlFor="safety-stock-days"
                text="Safety Stock Days"
              />

              <input
                id="safety-stock-days"
                type="number"
                min="0"
                max="90"
                value={safetyStockDays}
                onChange={(event) =>
                  setSafetyStockDays(event.target.value)
                }
                className={inputClassName}
              />

              <p className="mt-2 text-xs text-slate-500">
                0–90 days
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-800 pt-5">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={
                calculating || !selectedItemId
              }
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {calculating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  Calculate Smart Reorder
                </>
              )}
            </button>
          </div>
        </section>

        {recommendation && (
          <>
            {/* Top metrics */}
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Available Stock"
                value={recommendation.available_quantity}
                icon={
                  <Boxes className="h-5 w-5" />
                }
                accent="cyan"
              />

              <MetricCard
                label="Predicted Daily Usage"
                value={recommendation.predicted_daily_usage.toFixed(
                  2,
                )}
                icon={
                  <TrendingUp className="h-5 w-5" />
                }
                accent="violet"
              />

              <MetricCard
                label="Lead-Time Demand"
                value={recommendation.lead_time_demand.toFixed(
                  2,
                )}
                icon={
                  <Clock3 className="h-5 w-5" />
                }
                accent="amber"
              />

              <MetricCard
                label="Recommended Reorder"
                value={recommendation.recommended_quantity}
                icon={
                  <PackageCheck className="h-5 w-5" />
                }
                accent="emerald"
                highlight
              />
            </section>

            {/* Historical usage */}
            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-cyan-400" />

                    <h2 className="text-xl font-bold text-white">
                      Historical Usage
                    </h2>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    Actual daily stock issued during the selected
                    history window.
                  </p>
                </div>

                <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-400">
                  {usageHistory.length} days with usage data
                </div>
              </div>

              {usageHistory.length === 0 ? (
                <EmptyState text="No historical usage data was returned for this item." />
              ) : (
                <div className="mt-6 space-y-3">
                  {usageHistory.map((point) => {
                    const width =
                      (point.quantity /
                        maxUsageQuantity) *
                      100;

                    return (
                      <div
                        key={point.date}
                        className="grid grid-cols-[75px_1fr_50px] items-center gap-3"
                      >
                        <span className="text-xs font-medium text-slate-500">
                          {formatDate(point.date)}
                        </span>

                        <div className="h-7 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                          <div
                            className="h-full rounded-lg bg-cyan-500/80 transition-all"
                            style={{
                              width: `${Math.max(
                                width,
                                2,
                              )}%`,
                            }}
                          />
                        </div>

                        <span className="text-right text-sm font-bold text-slate-300">
                          {point.quantity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Forecast */}
            {forecast && (
              <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-emerald-400" />

                      <h2 className="text-xl font-bold text-white">
                        Demand Forecast
                      </h2>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      Forecasted daily usage for the next{" "}
                      {forecast.forecast_days} days.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <DarkBadge tone="cyan">
                      {forecast.method}
                    </DarkBadge>

                    <DarkBadge tone="amber">
                      Confidence: {forecast.confidence}
                    </DarkBadge>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <MetricCard
                    label="Historical Average"
                    value={forecast.average_daily_usage.toFixed(
                      2,
                    )}
                    icon={
                      <BarChart3 className="h-5 w-5" />
                    }
                    accent="cyan"
                  />

                  <MetricCard
                    label="Predicted Daily Usage"
                    value={forecast.predicted_daily_usage.toFixed(
                      2,
                    )}
                    icon={
                      <TrendingUp className="h-5 w-5" />
                    }
                    accent="violet"
                  />

                  <MetricCard
                    label="Forecast Horizon"
                    value={`${forecast.forecast_days} days`}
                    icon={
                      <Clock3 className="h-5 w-5" />
                    }
                    accent="amber"
                  />
                </div>

                <div className="mt-7 space-y-3">
                  {forecast.forecast.map((point) => {
                    const width =
                      (point.predicted_quantity /
                        maxForecastQuantity) *
                      100;

                    return (
                      <div
                        key={point.date}
                        className="grid grid-cols-[75px_1fr_65px] items-center gap-3"
                      >
                        <span className="text-xs font-medium text-slate-500">
                          {formatDate(point.date)}
                        </span>

                        <div className="h-7 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                          <div
                            className="h-full rounded-lg bg-emerald-500/80 transition-all"
                            style={{
                              width: `${Math.max(
                                width,
                                2,
                              )}%`,
                            }}
                          />
                        </div>

                        <span className="text-right text-sm font-bold text-slate-300">
                          {point.predicted_quantity.toFixed(
                            2,
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Item details */}
            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {recommendation.name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    SKU: {recommendation.sku}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <DarkBadge tone="cyan">
                    {recommendation.forecast_method}
                  </DarkBadge>

                  <DarkBadge tone="amber">
                    Confidence:{" "}
                    {recommendation.forecast_confidence}
                  </DarkBadge>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <DetailRow
                  label="Available Quantity"
                  value={recommendation.available_quantity}
                />

                <DetailRow
                  label="Reorder Point"
                  value={recommendation.reorder_point}
                />

                <DetailRow
                  label="Lead Time"
                  value={`${recommendation.lead_time_days} days`}
                />

                <DetailRow
                  label="Safety Stock"
                  value={recommendation.safety_stock.toFixed(
                    2,
                  )}
                />

                <DetailRow
                  label="Target Stock"
                  value={recommendation.target_stock.toFixed(
                    2,
                  )}
                />

                <DetailRow
                  label="Average Daily Usage"
                  value={recommendation.average_daily_usage.toFixed(
                    2,
                  )}
                />

                <DetailRow
                  label="Predicted Daily Usage"
                  value={recommendation.predicted_daily_usage.toFixed(
                    2,
                  )}
                />

                <DetailRow
                  label="Forecast Days"
                  value={forecastDays}
                />

                <DetailRow
                  label="Safety Stock Days"
                  value={recommendation.safety_stock_days}
                />
              </div>
            </section>

            {/* Calculation breakdown */}
            <section className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-6 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/60 p-3">
                  <BarChart3 className="h-5 w-5 text-cyan-400" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-cyan-400">
                    Calculation Engine
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-white">
                    Demand-Based Reorder Calculation
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    StockPulse combines predicted demand,
                    lead time, safety stock, and available
                    inventory.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <CalculationCard
                  label="Predicted Daily Usage"
                  value={`${recommendation.predicted_daily_usage.toFixed(2)} units/day`}
                />

                <CalculationCard
                  label="Lead-Time Demand"
                  value={`${recommendation.lead_time_demand.toFixed(2)} units`}
                  description={`${recommendation.predicted_daily_usage.toFixed(2)} × ${recommendation.lead_time_days} days`}
                />

                <CalculationCard
                  label="Safety Stock"
                  value={`${recommendation.safety_stock.toFixed(2)} units`}
                  description={`${recommendation.predicted_daily_usage.toFixed(2)} × ${recommendation.safety_stock_days} days`}
                />

                <CalculationCard
                  label="Target Stock"
                  value={`${recommendation.target_stock.toFixed(2)} units`}
                  description="Lead-time demand + safety stock"
                />
              </div>

              <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950 p-5">
                <div className="grid gap-5 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
                  <CalculationValue
                    label="Current Available Stock"
                    value={`${recommendation.available_quantity} units`}
                  />

                  <div className="hidden text-2xl font-bold text-slate-700 md:block">
                    −
                  </div>

                  <CalculationValue
                    label="Target Stock"
                    value={`${recommendation.target_stock.toFixed(2)} units`}
                  />

                  <div className="hidden text-2xl font-bold text-slate-700 md:block">
                    =
                  </div>

                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-400">
                      Recommended Purchase
                    </p>

                    <p className="mt-1 text-3xl font-black text-white">
                      {recommendation.recommended_quantity}
                      <span className="ml-1 text-sm font-semibold text-emerald-300">
                        units
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Smart recommendation */}
            <section className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 shadow-xl">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                    <Sparkles className="h-4 w-4" />
                    Smart Reorder Recommendation
                  </div>

                  <p className="mt-2 text-4xl font-black text-white">
                    {recommendation.recommended_quantity}
                    <span className="ml-2 text-lg font-semibold text-emerald-300">
                      units
                    </span>
                  </p>

                  <p className="mt-2 max-w-xl text-sm text-slate-400">
                    Based on predicted demand, lead time,
                    safety stock, and current available
                    inventory.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Low Stock Status
                  </p>

                  <p
                    className={`mt-2 flex items-center gap-2 text-sm font-bold ${
                      recommendation.is_low_stock
                        ? "text-red-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {recommendation.is_low_stock ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}

                    {recommendation.is_low_stock
                      ? "Below reorder point"
                      : "Above reorder point"}
                  </p>
                </div>
              </div>
            </section>

            {/* Purchase order */}
            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
              <div className="mb-6 flex items-start gap-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 p-3">
                  <ShoppingCart className="h-5 w-5 text-emerald-400" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white">
                    Create Purchase Order
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Convert the smart reorder recommendation
                    into a draft purchase order.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <DarkLabel
                    htmlFor="supplier"
                    text="Supplier"
                  />

                  <select
                    id="supplier"
                    value={selectedSupplierId}
                    onChange={(event) => {
                      setSelectedSupplierId(
                        event.target.value,
                      );
                      setCreatedPurchaseOrderId("");
                      setSuccess("");
                      setError("");
                    }}
                    className={inputClassName}
                  >
                    <option value="">
                      Select supplier
                    </option>

                    {suppliers.map((supplier) => (
                      <option
                        key={supplier.id}
                        value={supplier.id}
                      >
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <DarkLabel
                    htmlFor="po-quantity"
                    text="Purchase Quantity"
                  />

                  <input
                    id="po-quantity"
                    type="number"
                    min="1"
                    value={poQuantity}
                    onChange={(event) => {
                      setPoQuantity(
                        event.target.value,
                      );
                      setCreatedPurchaseOrderId("");
                    }}
                    className={inputClassName}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Automatically populated from the smart
                    reorder recommendation.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <DarkLabel
                    htmlFor="po-notes"
                    text="Notes"
                  />

                  <textarea
                    id="po-notes"
                    rows={3}
                    value={poNotes}
                    onChange={(event) =>
                      setPoNotes(event.target.value)
                    }
                    placeholder="Optional purchase order notes..."
                    className={`${inputClassName} resize-y`}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-5">
                <button
                  type="button"
                  onClick={handleCreatePurchaseOrder}
                  disabled={
                    creatingPurchaseOrder ||
                    !selectedSupplierId ||
                    !poQuantity
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {creatingPurchaseOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Purchase Order...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      Create Purchase Order
                    </>
                  )}
                </button>

                {createdPurchaseOrderId && (
                  <Link
                    href="/purchase-orders"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-5 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    View Purchase Orders
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>

              {createdPurchaseOrderId && (
                <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

                    <div>
                      <p className="text-sm font-bold text-emerald-300">
                        Draft purchase order created successfully.
                      </p>

                      <p className="mt-1 break-all text-xs text-emerald-400/80">
                        Purchase Order ID:{" "}
                        {createdPurchaseOrderId}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default function SmartReorderPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
              Loading Smart Reorder...
            </div>
          </div>
        </main>
      }
    >
      <SmartReorderContent />
    </Suspense>
  );
}

const inputClassName =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

function DarkLabel({
  htmlFor,
  text,
}: {
  htmlFor: string;
  text: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-semibold text-slate-300"
    >
      {text}
    </label>
  );
}

function MetricCard({
  label,
  value,
  icon,
  accent,
  highlight = false,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  accent: "cyan" | "violet" | "amber" | "emerald";
  highlight?: boolean;
}) {
  const styles = {
    cyan: {
      border: "border-cyan-500/20",
      bg: "bg-cyan-950/30",
      icon: "text-cyan-400",
    },
    violet: {
      border: "border-violet-500/20",
      bg: "bg-violet-950/30",
      icon: "text-violet-400",
    },
    amber: {
      border: "border-amber-500/20",
      bg: "bg-amber-950/30",
      icon: "text-amber-400",
    },
    emerald: {
      border: "border-emerald-500/20",
      bg: "bg-emerald-950/30",
      icon: "text-emerald-400",
    },
  };

  const style = styles[accent];

  return (
    <div
      className={`rounded-2xl border bg-slate-900 p-5 shadow-lg ${
        highlight
          ? "border-emerald-500/40"
          : "border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black text-white">
            {value}
          </p>
        </div>

        <div
          className={`rounded-xl border p-3 ${style.border} ${style.bg} ${style.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function CalculationCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-lg font-black text-white">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function CalculationValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function DarkBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "cyan" | "amber";
}) {
  const classes =
    tone === "cyan"
      ? "border-cyan-500/20 bg-cyan-950/40 text-cyan-300"
      : "border-amber-500/20 bg-amber-950/40 text-amber-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold ${classes}`}
    >
      {children}
    </span>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-6">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-5 w-5 text-slate-500" />

        <p className="text-sm text-slate-400">
          {text}
        </p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}
