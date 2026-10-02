"use client";

import { useEffect, useMemo, useState } from "react";

import { getCurrentUser, type CurrentUser } from "../lib/auth";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrders,
  orderPurchaseOrder,
  submitPurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "../lib/purchase-orders";

const ORGANIZATION_ID = "addc299a-6ab4-4399-83ab-490ce15f3faa";

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

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
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

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [user, orders] = await Promise.all([
        getCurrentUser(),
        getPurchaseOrders(ORGANIZATION_ID),
      ]);

      setCurrentUser(user);
      setPurchaseOrders(orders);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load purchase orders.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function runAction(
    purchaseOrderId: string,
    action: "submit" | "approve" | "order" | "cancel",
  ) {
    try {
      setActionLoadingId(purchaseOrderId);
      setError("");
      setSuccess("");

      let updatedOrder: PurchaseOrder;

      switch (action) {
        case "submit":
          updatedOrder = await submitPurchaseOrder(
            ORGANIZATION_ID,
            purchaseOrderId,
          );
          break;

        case "approve":
          updatedOrder = await approvePurchaseOrder(
            ORGANIZATION_ID,
            purchaseOrderId,
          );
          break;

        case "order":
          updatedOrder = await orderPurchaseOrder(
            ORGANIZATION_ID,
            purchaseOrderId,
          );
          break;

        case "cancel":
          updatedOrder = await cancelPurchaseOrder(
            ORGANIZATION_ID,
            purchaseOrderId,
          );
          break;
      }

        setPurchaseOrders((current) =>
            current.map((order) =>
                order.id === updatedOrder.id
                ? {
                    ...order,
                    ...updatedOrder,
                    items: order.items,
                    }
                : order,
            ),
        );

      setSuccess(
        `Purchase order ${updatedOrder.id} is now ${formatStatus(
          updatedOrder.status,
        )}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Purchase order action failed.",
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  function canSubmit(order: PurchaseOrder): boolean {
    return (
      order.status === "draft" &&
      (currentUser?.role === "admin" || currentUser?.role === "staff")
    );
  }

  function canApprove(order: PurchaseOrder): boolean {
    return (
      order.status === "pending_approval" &&
      currentUser?.role === "admin"
    );
  }

  function canOrder(order: PurchaseOrder): boolean {
    return (
      order.status === "approved" &&
      currentUser?.role === "admin"
    );
  }

  function canCancel(order: PurchaseOrder): boolean {
    return (
      ["draft", "pending_approval", "approved", "ordered"].includes(
        order.status,
      ) && currentUser?.role === "admin"
    );
  }

  const summary = useMemo(() => {
    return {
      total: purchaseOrders.length,
      drafts: purchaseOrders.filter(
        (order) => order.status === "draft",
      ).length,
      pendingApproval: purchaseOrders.filter(
        (order) => order.status === "pending_approval",
      ).length,
      ordered: purchaseOrders.filter(
        (order) => order.status === "ordered",
      ).length,
      received: purchaseOrders.filter(
        (order) => order.status === "received",
      ).length,
    };
  }, [purchaseOrders]);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Purchase Orders
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Create, review, approve, order, and track purchase orders.
            </p>

            {currentUser && (
              <p className="mt-1 text-xs text-slate-500">
                Signed in as {currentUser.email} · Role:{" "}
                {currentUser.role}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard label="Total" value={summary.total} />
          <SummaryCard label="Draft" value={summary.drafts} />
          <SummaryCard
            label="Pending Approval"
            value={summary.pendingApproval}
          />
          <SummaryCard label="Ordered" value={summary.ordered} />
          <SummaryCard label="Received" value={summary.received} />
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Purchase Order List
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Loading purchase orders...
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No purchase orders found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Purchase Order</th>
                    <th className="px-5 py-3">Supplier</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Items</th>
                    <th className="px-5 py-3">Ordered</th>
                    <th className="px-5 py-3">Received</th>
                    <th className="px-5 py-3">Order Date</th>
                    <th className="px-5 py-3">Expected</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {purchaseOrders.map((order) => {
                    const totalOrdered = order.items.reduce(
                      (sum, item) => sum + item.quantity,
                      0,
                    );

                    const totalReceived = order.items.reduce(
                      (sum, item) => sum + item.received_quantity,
                      0,
                    );

                    const busy =
                      actionLoadingId === order.id;

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-900">
                            {order.id}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            Created {formatDate(order.created_at)}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-mono text-xs text-slate-600">
                            {order.supplier_id}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(
                              order.status,
                            )}`}
                          >
                            {formatStatus(order.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {order.items.length}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {totalOrdered}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {totalReceived} / {totalOrdered}
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-600">
                          {formatDate(order.order_date)}
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-600">
                          {formatDate(order.expected_date)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {canSubmit(order) && (
                              <ActionButton
                                label="Submit"
                                disabled={busy}
                                onClick={() =>
                                  runAction(order.id, "submit")
                                }
                              />
                            )}

                            {canApprove(order) && (
                              <ActionButton
                                label="Approve"
                                disabled={busy}
                                onClick={() =>
                                  runAction(order.id, "approve")
                                }
                              />
                            )}

                            {canOrder(order) && (
                              <ActionButton
                                label="Mark Ordered"
                                disabled={busy}
                                onClick={() =>
                                  runAction(order.id, "order")
                                }
                              />
                            )}

                            {canCancel(order) && (
                              <ActionButton
                                label="Cancel"
                                disabled={busy}
                                variant="danger"
                                onClick={() =>
                                  runAction(order.id, "cancel")
                                }
                              />
                            )}

                            {!canSubmit(order) &&
                              !canApprove(order) &&
                              !canOrder(order) &&
                              !canCancel(order) && (
                                <span className="text-xs text-slate-400">
                                  No actions
                                </span>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
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
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
  variant = "default",
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        variant === "danger"
          ? "rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          : "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {disabled ? "Working..." : label}
    </button>
  );
}