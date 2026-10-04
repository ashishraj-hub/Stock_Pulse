"use client";

import { Suspense,useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

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

  const [inventory, setInventory] = useState<InventoryListItem[]>(
    [],
  );

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [selectedItemId, setSelectedItemId] = useState("");

  const [selectedSupplierId, setSelectedSupplierId] =
    useState("");

  const [historyDays, setHistoryDays] = useState("30");
  const [forecastDays, setForecastDays] = useState("7");
  const [safetyStockDays, setSafetyStockDays] = useState("3");

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

  // When Reorder Center opens this page with ?itemId=...,
  // automatically select that item after inventory has loaded.
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
        existing.available_quantity += row.available_quantity;
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

      // Smart recommendation becomes the default PO quantity.
      setPoQuantity(
        String(recommendationResult.recommended_quantity),
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

      const result = await createSmartReorderPurchaseOrder(
        currentUser?.organization_id ?? ORGANIZATION_ID,
        recommendation.item_id,
        {
          item_id: recommendation.item_id,
          supplier_id: selectedSupplierId,
          quantity: parsedQuantity,
          notes: poNotes.trim() || undefined,
        },
      );

      setCreatedPurchaseOrderId(result.purchase_order_id);

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
      ...(
        forecast?.forecast.map(
          (point) => point.predicted_quantity,
        ) ?? []
      ),
      1,
    );
  }, [forecast]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              Loading Smart Reorder...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">
              StockPulse Intelligence
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Smart Reorder
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Use historical stock usage and forecasting to
              calculate a demand-based reorder recommendation.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex w-fit items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {/* Forecast configuration */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Forecast Configuration
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select an item and configure the forecasting window.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {/* Item */}
            <div className="lg:col-span-2">
              <label
                htmlFor="item"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Item
              </label>

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
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                  Current frontend inventory:{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedItem.available_quantity}
                  </span>{" "}
                  available units.
                </p>
              )}
            </div>

            {/* History */}
            <div>
              <label
                htmlFor="history-days"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                History Days
              </label>

              <input
                id="history-days"
                type="number"
                min="3"
                max="365"
                value={historyDays}
                onChange={(event) =>
                  setHistoryDays(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Forecast */}
            <div>
              <label
                htmlFor="forecast-days"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Forecast Days
              </label>

              <input
                id="forecast-days"
                type="number"
                min="1"
                max="90"
                value={forecastDays}
                onChange={(event) =>
                  setForecastDays(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Safety stock */}
            <div>
              <label
                htmlFor="safety-stock-days"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Safety Stock Days
              </label>

              <input
                id="safety-stock-days"
                type="number"
                min="0"
                max="90"
                value={safetyStockDays}
                onChange={(event) =>
                  setSafetyStockDays(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={calculating || !selectedItemId}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {calculating
                ? "Analyzing..."
                : "Calculate Smart Reorder"}
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
              />

              <MetricCard
                label="Predicted Daily Usage"
                value={recommendation.predicted_daily_usage.toFixed(
                  2,
                )}
              />

              <MetricCard
                label="Lead-Time Demand"
                value={recommendation.lead_time_demand.toFixed(2)}
              />

              <MetricCard
                label="Recommended Reorder"
                value={recommendation.recommended_quantity}
                highlight
              />
            </section>

            {/* Historical Usage */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Historical Usage
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Actual daily stock issued during the selected
                    history window.
                  </p>
                </div>

                <div className="text-sm text-slate-500">
                  {usageHistory.length} days with usage data
                </div>
              </div>

              {usageHistory.length === 0 ? (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm text-slate-600">
                    No historical usage data was returned for
                    this item.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {usageHistory.map((point) => {
                    const width =
                      (point.quantity / maxUsageQuantity) * 100;

                    return (
                      <div
                        key={point.date}
                        className="grid grid-cols-[90px_1fr_55px] items-center gap-3"
                      >
                        <span className="text-xs font-medium text-slate-500">
                          {formatDate(point.date)}
                        </span>

                        <div className="h-7 overflow-hidden rounded-md bg-slate-100">
                          <div
                            className="h-full rounded-md bg-blue-500 transition-all"
                            style={{
                              width: `${Math.max(width, 2)}%`,
                            }}
                          />
                        </div>

                        <span className="text-right text-sm font-semibold text-slate-800">
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
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Demand Forecast
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Forecasted daily usage for the next{" "}
                      {forecast.forecast_days} days.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      {forecast.method}
                    </span>

                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                      Confidence: {forecast.confidence}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <MetricCard
                    label="Historical Average"
                    value={forecast.average_daily_usage.toFixed(2)}
                  />

                  <MetricCard
                    label="Predicted Daily Usage"
                    value={forecast.predicted_daily_usage.toFixed(2)}
                  />

                  <MetricCard
                    label="Forecast Horizon"
                    value={`${forecast.forecast_days} days`}
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
                        className="grid grid-cols-[90px_1fr_70px] items-center gap-3"
                      >
                        <span className="text-xs font-medium text-slate-500">
                          {formatDate(point.date)}
                        </span>

                        <div className="h-7 overflow-hidden rounded-md bg-slate-100">
                          <div
                            className="h-full rounded-md bg-emerald-500 transition-all"
                            style={{
                              width: `${Math.max(width, 2)}%`,
                            }}
                          />
                        </div>

                        <span className="text-right text-sm font-semibold text-slate-800">
                          {point.predicted_quantity.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Forecast details */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {recommendation.name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    SKU: {recommendation.sku}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    {recommendation.forecast_method}
                  </span>

                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    Confidence:{" "}
                    {recommendation.forecast_confidence}
                  </span>
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
                  value={recommendation.safety_stock.toFixed(2)}
                />

                <DetailRow
                  label="Target Stock"
                  value={recommendation.target_stock.toFixed(2)}
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

            {/* Recommendation calculation breakdown */}
            <section className="rounded-xl border border-blue-200 bg-blue-50 p-6">
              <div>
                <p className="text-sm font-medium text-blue-700">
                  How StockPulse calculated this recommendation
                </p>

                <h2 className="mt-1 text-xl font-semibold text-blue-950">
                  Demand-Based Reorder Calculation
                </h2>
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

              <div className="mt-5 rounded-lg border border-blue-200 bg-white p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Current Available Stock
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {recommendation.available_quantity} units
                    </p>
                  </div>

                  <div className="text-center text-2xl font-bold text-slate-400">
                    −
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Target Stock
                    </p>

                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {recommendation.target_stock.toFixed(2)} units
                    </p>
                  </div>

                  <div className="text-center text-2xl font-bold text-slate-400">
                    =
                  </div>

                  <div>
                    <p className="text-sm font-medium text-blue-600">
                      Recommended Purchase
                    </p>

                    <p className="mt-1 text-3xl font-bold text-blue-700">
                      {recommendation.recommended_quantity} units
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Smart recommendation */}
            <section className="rounded-xl border border-blue-200 bg-blue-50 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Smart Reorder Recommendation
                  </p>

                  <p className="mt-1 text-3xl font-bold text-blue-900">
                    {recommendation.recommended_quantity} units
                  </p>

                  <p className="mt-2 text-sm text-blue-800">
                    Based on predicted demand, lead time, safety
                    stock, and current available inventory.
                  </p>
                </div>

                <div className="rounded-lg border border-blue-200 bg-white px-5 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Low Stock Status
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${
                      recommendation.is_low_stock
                        ? "text-red-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {recommendation.is_low_stock
                      ? "Below reorder point"
                      : "Above reorder point"}
                  </p>
                </div>
              </div>
            </section>

            {/* Create PO */}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-semibold text-slate-900">
                  Create Purchase Order
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Convert the smart reorder recommendation into a
                  draft purchase order.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {/* Supplier */}
                <div>
                  <label
                    htmlFor="supplier"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Supplier
                  </label>

                  <select
                    id="supplier"
                    value={selectedSupplierId}
                    onChange={(event) => {
                      setSelectedSupplierId(event.target.value);
                      setCreatedPurchaseOrderId("");
                      setSuccess("");
                      setError("");
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

                {/* Quantity */}
                <div>
                  <label
                    htmlFor="po-quantity"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Purchase Quantity
                  </label>

                  <input
                    id="po-quantity"
                    type="number"
                    min="1"
                    value={poQuantity}
                    onChange={(event) => {
                      setPoQuantity(event.target.value);
                      setCreatedPurchaseOrderId("");
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Automatically populated from the smart
                    reorder recommendation.
                  </p>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="po-notes"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Notes
                  </label>

                  <textarea
                    id="po-notes"
                    rows={3}
                    value={poNotes}
                    onChange={(event) =>
                      setPoNotes(event.target.value)
                    }
                    placeholder="Optional purchase order notes..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCreatePurchaseOrder}
                  disabled={
                    creatingPurchaseOrder ||
                    !selectedSupplierId ||
                    !poQuantity
                  }
                  className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingPurchaseOrder
                    ? "Creating Purchase Order..."
                    : "Create Purchase Order"}
                </button>

                {createdPurchaseOrderId && (
                  <Link
                    href="/purchase-orders"
                    className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    View Purchase Orders
                  </Link>
                )}
              </div>

              {createdPurchaseOrderId && (
                <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-800">
                    Draft purchase order created successfully.
                  </p>

                  <p className="mt-1 break-all text-xs text-emerald-700">
                    Purchase Order ID:{" "}
                    {createdPurchaseOrderId}
                  </p>
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
        <main className="min-h-screen bg-slate-950 p-6 text-white">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
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

function MetricCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${
        highlight
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${
          highlight ? "text-blue-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
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
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold text-slate-900">
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
    <div className="rounded-lg border border-blue-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold text-slate-900">
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

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}