"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getCurrentUser, type CurrentUser } from "../../lib/auth";
import {
  getPurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "../../lib/purchase-orders";

const ORGANIZATION_ID =
  "addc299a-6ab4-4399-83ab-490ce15f3faa";

function formatStatus(status: PurchaseOrderStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending_approval":
      return "Pending Approval";
    case "approved":
      return "Approved";
    case "ordered":
      return "Ordered";
    case "received":
      return "Received";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function statusClasses(status: PurchaseOrderStatus): string {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-700";
    case "pending_approval":
      return "bg-amber-100 text-amber-800";
    case "approved":
      return "bg-blue-100 text-blue-800";
    case "ordered":
      return "bg-purple-100 text-purple-800";
    case "received":
      return "bg-emerald-100 text-emerald-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-all text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

export default function PurchaseOrderDetailPage() {
  const params = useParams();

  const purchaseOrderId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [purchaseOrder, setPurchaseOrder] =
    useState<PurchaseOrder | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      if (!purchaseOrderId) {
        setError("Purchase order ID is missing.");
        return;
      }

      const [user, order] = await Promise.all([
        getCurrentUser(),
        getPurchaseOrder(
          ORGANIZATION_ID,
          purchaseOrderId,
        ),
      ]);

      setCurrentUser(user);
      setPurchaseOrder(order);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load purchase order.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [purchaseOrderId]);

  const summary = useMemo(() => {
    if (!purchaseOrder) {
      return {
        totalOrdered: 0,
        totalReceived: 0,
        totalRemaining: 0,
      };
    }

    return purchaseOrder.items.reduce(
      (result, item) => {
        const remaining =
          item.quantity -
          item.received_quantity;

        return {
          totalOrdered:
            result.totalOrdered +
            item.quantity,

          totalReceived:
            result.totalReceived +
            item.received_quantity,

          totalRemaining:
            result.totalRemaining +
            remaining,
        };
      },
      {
        totalOrdered: 0,
        totalReceived: 0,
        totalRemaining: 0,
      },
    );
  }, [purchaseOrder]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-slate-500">
            Loading purchase order...
          </p>
        </div>
      </main>
    );
  }

  if (error || !purchaseOrder) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <Link
            href="/purchase-orders"
            className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ← Back to Purchase Orders
          </Link>

          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error || "Purchase order not found."}
          </div>
        </div>
      </main>
    );
  }

  const canReceive =
    (currentUser?.role === "admin" ||
      currentUser?.role === "staff") &&
    purchaseOrder.status === "ordered";

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href="/purchase-orders"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to Purchase Orders
            </Link>

            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              Purchase Order
            </h1>

            <p className="mt-1 break-all font-mono text-sm text-slate-500">
              {purchaseOrder.id}
            </p>

            {currentUser && (
              <p className="mt-2 text-xs text-slate-500">
                Signed in as {currentUser.email} · Role:{" "}
                {currentUser.role}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${statusClasses(
                purchaseOrder.status,
              )}`}
            >
              {formatStatus(
                purchaseOrder.status,
              )}
            </span>

            {canReceive && (
              <Link
                href={`/purchase-orders/receiving?purchaseOrderId=${purchaseOrder.id}`}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Receive Stock
              </Link>
            )}

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </header>

        {/* Basic information */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Purchase Order Information
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard
              label="Supplier"
              value={purchaseOrder.supplier_id}
            />

            <InfoCard
              label="Created By"
              value={purchaseOrder.created_by}
            />

            <InfoCard
              label="Created At"
              value={formatDate(
                purchaseOrder.created_at,
              )}
            />

            <InfoCard
              label="Order Date"
              value={formatDate(
                purchaseOrder.order_date,
              )}
            />

            <InfoCard
              label="Expected Date"
              value={formatDate(
                purchaseOrder.expected_date,
              )}
            />

            <InfoCard
              label="Status"
              value={formatStatus(
                purchaseOrder.status,
              )}
            />

            <InfoCard
              label="Organization"
              value={
                purchaseOrder.organization_id
              }
            />

            <InfoCard
              label="Items"
              value={String(
                purchaseOrder.items.length,
              )}
            />
          </div>

          {purchaseOrder.notes && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Notes
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {purchaseOrder.notes}
              </p>
            </div>
          )}
        </section>

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total Ordered"
            value={summary.totalOrdered}
          />

          <SummaryCard
            label="Total Received"
            value={summary.totalReceived}
          />

          <SummaryCard
            label="Remaining"
            value={summary.totalRemaining}
          />
        </section>

        {/* Receiving progress */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Items & Receiving Progress
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Track ordered, received, and remaining
              quantities for every item.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">
                    Item ID
                  </th>

                  <th className="px-5 py-3">
                    Ordered
                  </th>

                  <th className="px-5 py-3">
                    Received
                  </th>

                  <th className="px-5 py-3">
                    Remaining
                  </th>

                  <th className="px-5 py-3">
                    Unit Price
                  </th>

                  <th className="px-5 py-3">
                    Progress
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {purchaseOrder.items.map(
                  (item) => {
                    const remaining =
                      item.quantity -
                      item.received_quantity;

                    const percentage =
                      item.quantity > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (item.received_quantity /
                                item.quantity) *
                                100,
                            ),
                          )
                        : 0;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs text-slate-700">
                            {item.item_id}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            PO Item: {item.id}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-900">
                          {item.quantity}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {item.received_quantity}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={
                              remaining > 0
                                ? "font-semibold text-amber-700"
                                : "font-semibold text-emerald-700"
                            }
                          >
                            {remaining}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {item.unit_price !== null
                            ? item.unit_price
                            : "—"}
                        </td>

                        <td className="px-5 py-4">
                          <div className="w-40">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">
                                {percentage}%
                              </span>

                              <span className="text-slate-400">
                                {item.received_quantity}/
                                {item.quantity}
                              </span>
                            </div>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{
                                  width: `${percentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Workflow status */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            Procurement Workflow
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <WorkflowStep
              label="Draft"
              active={
                purchaseOrder.status === "draft"
              }
            />

            <WorkflowStep
              label="Pending Approval"
              active={
                purchaseOrder.status ===
                "pending_approval"
              }
            />

            <WorkflowStep
              label="Approved"
              active={
                purchaseOrder.status === "approved"
              }
            />

            <WorkflowStep
              label="Ordered"
              active={
                purchaseOrder.status === "ordered"
              }
            />

            <WorkflowStep
              label="Received"
              active={
                purchaseOrder.status === "received"
              }
            />

            <WorkflowStep
              label="Cancelled"
              active={
                purchaseOrder.status === "cancelled"
              }
              cancelled
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function WorkflowStep({
  label,
  active,
  cancelled = false,
}: {
  label: string;
  active: boolean;
  cancelled?: boolean;
}) {
  return (
    <div
      className={
        active
          ? cancelled
            ? "rounded-lg border border-red-200 bg-red-50 p-3"
            : "rounded-lg border border-emerald-200 bg-emerald-50 p-3"
          : "rounded-lg border border-slate-200 bg-slate-50 p-3"
      }
    >
      <div className="flex items-center gap-2">
        <span
          className={
            active
              ? cancelled
                ? "h-2.5 w-2.5 rounded-full bg-red-500"
                : "h-2.5 w-2.5 rounded-full bg-emerald-500"
              : "h-2.5 w-2.5 rounded-full bg-slate-300"
          }
        />

        <span
          className={
            active
              ? cancelled
                ? "text-sm font-semibold text-red-800"
                : "text-sm font-semibold text-emerald-800"
              : "text-sm text-slate-500"
          }
        >
          {label}
        </span>
      </div>
    </div>
  );
}