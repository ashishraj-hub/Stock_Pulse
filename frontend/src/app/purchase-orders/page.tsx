"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  PackageCheck,
  Plus,
  RefreshCw,
  Send,
  ShoppingCart,
  X,
} from "lucide-react";

import { getCurrentUser, type CurrentUser } from "../lib/auth";
import { getItems, type Item } from "../lib/items";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrders,
  orderPurchaseOrder,
  receivePurchaseOrder,
  submitPurchaseOrder,
  type CreatePurchaseOrderRequest,
  type PurchaseOrder,
  type PurchaseOrderItemCreate,
  type PurchaseOrderReceiveItem,
  type PurchaseOrderStatus,
} from "../lib/purchase-orders";
import { getLocations, type Location } from "../lib/locations";
import { getSuppliers, type Supplier } from "../lib/suppliers";

type ItemLine = {
  item_id: string;
  quantity: string;
  unit_price: string;
};

type ReceiveLine = {
  purchase_order_item_id: string;
  location_id: string;
  quantity: string;
  lot_number: string;
  expiry_date: string;
};

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  ordered: "Ordered",
  received: "Received",
  cancelled: "Cancelled",
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function statusClasses(status: PurchaseOrderStatus) {
  switch (status) {
    case "draft":
      return "border-zinc-700 bg-zinc-800 text-zinc-200";

    case "pending_approval":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";

    case "approved":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";

    case "ordered":
      return "border-violet-500/30 bg-violet-500/10 text-violet-300";

    case "received":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

    case "cancelled":
      return "border-red-500/30 bg-red-500/10 text-red-300";

    default:
      return "border-zinc-700 bg-zinc-800 text-zinc-200";
  }
}

function getOrderTotal(
  order: PurchaseOrder,
): { total: number; hasPrices: boolean } {
  let total = 0;
  let hasPrices = false;

  for (const item of order.items) {
    if (item.unit_price !== null && item.unit_price !== undefined) {
      const price = Number(item.unit_price);

      if (!Number.isNaN(price)) {
        total += price * item.quantity;
        hasPrices = true;
      }
    }
  }

  return {
    total,
    hasPrices,
  };
}

export default function PurchaseOrdersPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    PurchaseOrderStatus | "all"
  >("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");

  const [itemLines, setItemLines] = useState<ItemLine[]>([
    {
      item_id: "",
      quantity: "1",
      unit_price: "",
    },
  ]);

  const [creating, setCreating] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [actionError, setActionError] = useState("");

  /*
   * The organization is always taken from the authenticated user.
   * Never hardcode a tenant/organization ID in this page.
   */
  const organizationId = currentUser?.organization_id ?? "";

  /*
   * Receiving state
   */
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedReceiveOrder, setSelectedReceiveOrder] =
    useState<PurchaseOrder | null>(null);
  const [receiveLines, setReceiveLines] = useState<ReceiveLine[]>([]);
  const [receiving, setReceiving] = useState(false);
  const [receiveError, setReceiveError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const user = await getCurrentUser();

        if (!user) {
          throw new Error("You are not logged in.");
        }

        setCurrentUser(user);

        /*
         * Important:
         * currentUser state updates asynchronously, so the initial
         * requests must use user.organization_id directly.
         */
        const [
          orderData,
          supplierData,
          itemData,
          locationData,
        ] = await Promise.all([
          getPurchaseOrders(user.organization_id),
          getSuppliers(user.organization_id),
          getItems(user.organization_id),
          getLocations(user.organization_id),
        ]);

        setOrders(orderData);
        setSuppliers(supplierData);
        setItems(itemData);
        setLocations(locationData);
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

    void load();
  }, []);

  async function refreshOrders() {
    if (!organizationId) {
      setError("Organization information is unavailable.");
      return;
    }

    try {
      setRefreshing(true);
      setError("");

      const data = await getPurchaseOrders(organizationId);

      setOrders(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to refresh purchase orders.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  const supplierMap = useMemo(() => {
    return new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  }, [suppliers]);

  const itemMap = useMemo(() => {
    return new Map(items.map((item) => [item.id, item]));
  }, [items]);

  const locationMap = useMemo(() => {
    return new Map(locations.map((location) => [location.id, location]));
  }, [locations]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const supplierName =
        supplierMap.get(order.supplier_id)?.name?.toLowerCase() ?? "";

      const orderId = order.id.toLowerCase();

      const itemText = order.items
        .map((line) => {
          const item = itemMap.get(line.item_id);

          return `${item?.name ?? ""} ${item?.sku ?? ""}`;
        })
        .join(" ")
        .toLowerCase();

      return (
        supplierName.includes(query) ||
        orderId.includes(query) ||
        itemText.includes(query)
      );
    });
  }, [orders, search, statusFilter, supplierMap, itemMap]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      draft: orders.filter((order) => order.status === "draft").length,
      pending: orders.filter(
        (order) => order.status === "pending_approval",
      ).length,
      approved: orders.filter((order) => order.status === "approved").length,
      ordered: orders.filter((order) => order.status === "ordered").length,
      received: orders.filter((order) => order.status === "received").length,
    };
  }, [orders]);

  const canCreate =
    currentUser?.role === "admin" || currentUser?.role === "staff";

  const canReceive =
    currentUser?.role === "admin" || currentUser?.role === "staff";

  const isAdmin = currentUser?.role === "admin";

  function resetCreateForm() {
    setSelectedSupplierId("");
    setExpectedDate("");
    setNotes("");

    setItemLines([
      {
        item_id: "",
        quantity: "1",
        unit_price: "",
      },
    ]);
  }

  function openCreateModal() {
    if (!canCreate) {
      return;
    }

    setActionError("");
    resetCreateForm();
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    if (creating) return;

    setShowCreateModal(false);
    setActionError("");
  }

  function addItemLine() {
    setItemLines((current) => [
      ...current,
      {
        item_id: "",
        quantity: "1",
        unit_price: "",
      },
    ]);
  }

  function removeItemLine(index: number) {
    setItemLines((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((_, lineIndex) => lineIndex !== index);
    });
  }

  function updateItemLine(
    index: number,
    field: keyof ItemLine,
    value: string,
  ) {
    setItemLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              [field]: value,
            }
          : line,
      ),
    );
  }

  function hasDuplicateItems() {
    const selected = itemLines
      .map((line) => line.item_id)
      .filter(Boolean);

    return new Set(selected).size !== selected.length;
  }

  async function handleCreatePurchaseOrder(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setActionError("");

    if (!organizationId) {
      setActionError("Organization information is unavailable.");
      return;
    }

    if (!canCreate) {
      setActionError(
        "You do not have permission to create purchase orders.",
      );
      return;
    }

    if (!selectedSupplierId) {
      setActionError("Please select a supplier.");
      return;
    }

    if (itemLines.length === 0) {
      setActionError("Add at least one item.");
      return;
    }

    if (itemLines.some((line) => !line.item_id)) {
      setActionError("Select an item for every line.");
      return;
    }

    if (hasDuplicateItems()) {
      setActionError("The same item cannot appear more than once.");
      return;
    }

    if (
      itemLines.some(
        (line) =>
          !Number.isInteger(Number(line.quantity)) ||
          Number(line.quantity) <= 0,
      )
    ) {
      setActionError("Every quantity must be a whole number greater than 0.");
      return;
    }

    if (
      itemLines.some(
        (line) =>
          line.unit_price.trim() !== "" &&
          (Number.isNaN(Number(line.unit_price)) ||
            Number(line.unit_price) < 0),
      )
    ) {
      setActionError("Unit prices must be valid non-negative numbers.");
      return;
    }

    const payloadItems: PurchaseOrderItemCreate[] = itemLines.map((line) => ({
      item_id: line.item_id,
      quantity: Number(line.quantity),
      unit_price:
        line.unit_price.trim() === "" ? null : Number(line.unit_price),
    }));

    const payload: CreatePurchaseOrderRequest = {
      supplier_id: selectedSupplierId,
      expected_date: expectedDate
        ? new Date(expectedDate).toISOString()
        : null,
      notes: notes.trim() || null,
      items: payloadItems,
    };

    try {
      setCreating(true);

      const created = await createPurchaseOrder(
        organizationId,
        payload,
      );

      setOrders((current) => [created, ...current]);

      setShowCreateModal(false);

      resetCreateForm();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to create purchase order.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleWorkflowAction(
    order: PurchaseOrder,
    action: "submit" | "approve" | "order" | "cancel",
  ) {
    setActionError("");

    if (!organizationId) {
      setActionError("Organization information is unavailable.");
      return;
    }

    let confirmation = "";

    switch (action) {
      case "submit":
        confirmation = "Submit this purchase order for approval?";
        break;

      case "approve":
        confirmation = "Approve this purchase order?";
        break;

      case "order":
        confirmation =
          "Place this purchase order? This will move it to Ordered status.";
        break;

      case "cancel":
        confirmation =
          "Cancel this purchase order? This action cannot be undone.";
        break;
    }

    if (!window.confirm(confirmation)) {
      return;
    }

    try {
      setActionLoadingId(order.id);

      let updated: PurchaseOrder;

      switch (action) {
        case "submit":
          updated = await submitPurchaseOrder(
            organizationId,
            order.id,
          );
          break;

        case "approve":
          updated = await approvePurchaseOrder(
            organizationId,
            order.id,
          );
          break;

        case "order":
          updated = await orderPurchaseOrder(
            organizationId,
            order.id,
          );
          break;

        case "cancel":
          updated = await cancelPurchaseOrder(
            organizationId,
            order.id,
          );
          break;
      }

      setOrders((current) =>
        current.map((existing) =>
          existing.id === updated.id ? updated : existing,
        ),
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Purchase order action failed.",
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  /*
   * Receiving
   */

  function createInitialReceiveLines(order: PurchaseOrder): ReceiveLine[] {
    return order.items
      .filter((line) => line.received_quantity < line.quantity)
      .map((line) => ({
        purchase_order_item_id: line.id,
        location_id: "",
        quantity: String(line.quantity - line.received_quantity),
        lot_number: "",
        expiry_date: "",
      }));
  }

  function openReceiveModal(order: PurchaseOrder) {
    if (!canReceive) {
      return;
    }

    if (!order || !organizationId) {
      return;
    }

    if (order.status !== "ordered") {
      return;
    }

    setReceiveError("");
    setSelectedReceiveOrder(order);
    setReceiveLines(createInitialReceiveLines(order));
    setShowReceiveModal(true);
  }

  function closeReceiveModal() {
    if (receiving) {
      return;
    }

    setShowReceiveModal(false);
    setSelectedReceiveOrder(null);
    setReceiveLines([]);
    setReceiveError("");
  }

  function updateReceiveLine(
    index: number,
    field: keyof ReceiveLine,
    value: string,
  ) {
    setReceiveLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              [field]: value,
            }
          : line,
      ),
    );
  }

  function getRemainingQuantity(
    order: PurchaseOrder,
    purchaseOrderItemId: string,
  ) {
    const line = order.items.find(
      (item) => item.id === purchaseOrderItemId,
    );

    if (!line) {
      return 0;
    }

    return line.quantity - line.received_quantity;
  }

  async function handleReceivePurchaseOrder(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setReceiveError("");

    if (!organizationId) {
      setReceiveError("Organization information is unavailable.");
      return;
    }

    if (!canReceive) {
      setReceiveError(
        "You do not have permission to receive purchase orders.",
      );
      return;
    }

    if (!selectedReceiveOrder) {
      setReceiveError("No purchase order selected.");
      return;
    }

    if (selectedReceiveOrder.status !== "ordered") {
      setReceiveError(
        "Only ordered purchase orders can be received.",
      );
      return;
    }

    if (receiveLines.length === 0) {
      setReceiveError("There are no outstanding items to receive.");
      return;
    }

    for (const line of receiveLines) {
      const remainingQuantity = getRemainingQuantity(
        selectedReceiveOrder,
        line.purchase_order_item_id,
      );

      if (!line.location_id) {
        setReceiveError("Select a location for every item.");
        return;
      }

      if (
        !Number.isInteger(Number(line.quantity)) ||
        Number(line.quantity) <= 0
      ) {
        setReceiveError(
          "Every received quantity must be a whole number greater than 0.",
        );
        return;
      }

      if (Number(line.quantity) > remainingQuantity) {
        setReceiveError(
          `Received quantity cannot exceed the remaining quantity of ${remainingQuantity}.`,
        );
        return;
      }

      if (!line.lot_number.trim()) {
        setReceiveError("Enter a lot number for every item.");
        return;
      }
    }

    const payloadItems: PurchaseOrderReceiveItem[] = receiveLines.map(
      (line) => ({
        purchase_order_item_id: line.purchase_order_item_id,
        location_id: line.location_id,
        quantity: Number(line.quantity),
        lot_number: line.lot_number.trim(),
        expiry_date: line.expiry_date || null,
      }),
    );

    try {
      setReceiving(true);

      const updated = await receivePurchaseOrder(
        organizationId,
        selectedReceiveOrder.id,
        {
          items: payloadItems,
        },
      );

      setOrders((current) =>
        current.map((existing) =>
          existing.id === updated.id ? updated : existing,
        ),
      );

      setShowReceiveModal(false);
      setSelectedReceiveOrder(null);
      setReceiveLines([]);
      setReceiveError("");
    } catch (err) {
      setReceiveError(
        err instanceof Error
          ? err.message
          : "Failed to receive purchase order.",
      );
    } finally {
      setReceiving(false);
    }
  }

  function renderWorkflowActions(order: PurchaseOrder) {
    const loadingThisOrder = actionLoadingId === order.id;

    const buttonClass =
      "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50";

    if (order.status === "draft") {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          {canCreate && (
            <button
              type="button"
              disabled={loadingThisOrder}
              onClick={() =>
                void handleWorkflowAction(order, "submit")
              }
              className={`${buttonClass} border-blue-500/30 bg-blue-500/10 text-blue-300`}
            >
              <Send size={14} />

              {loadingThisOrder ? "Submitting..." : "Submit"}
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              disabled={loadingThisOrder}
              onClick={() =>
                void handleWorkflowAction(order, "cancel")
              }
              className={`${buttonClass} border-red-500/30 bg-red-500/10 text-red-300`}
            >
              <X size={14} />

              Cancel
            </button>
          )}
        </div>
      );
    }

    if (order.status === "pending_approval") {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          {isAdmin && (
            <>
              <button
                type="button"
                disabled={loadingThisOrder}
                onClick={() =>
                  void handleWorkflowAction(order, "approve")
                }
                className={`${buttonClass} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`}
              >
                <Check size={14} />

                {loadingThisOrder ? "Approving..." : "Approve"}
              </button>

              <button
                type="button"
                disabled={loadingThisOrder}
                onClick={() =>
                  void handleWorkflowAction(order, "cancel")
                }
                className={`${buttonClass} border-red-500/30 bg-red-500/10 text-red-300`}
              >
                <X size={14} />

                Cancel
              </button>
            </>
          )}
        </div>
      );
    }

    if (order.status === "approved") {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          {isAdmin && (
            <>
              <button
                type="button"
                disabled={loadingThisOrder}
                onClick={() =>
                  void handleWorkflowAction(order, "order")
                }
                className={`${buttonClass} border-violet-500/30 bg-violet-500/10 text-violet-300`}
              >
                <ShoppingCart size={14} />

                {loadingThisOrder ? "Ordering..." : "Place Order"}
              </button>

              <button
                type="button"
                disabled={loadingThisOrder}
                onClick={() =>
                  void handleWorkflowAction(order, "cancel")
                }
                className={`${buttonClass} border-red-500/30 bg-red-500/10 text-red-300`}
              >
                <X size={14} />

                Cancel
              </button>
            </>
          )}
        </div>
      );
    }

    if (order.status === "ordered") {
      return (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canReceive ? (
            <button
              type="button"
              disabled={receiving || loadingThisOrder}
              onClick={() => openReceiveModal(order)}
              className={`${buttonClass} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`}
            >
              <PackageCheck size={14} />

              Receive
            </button>
          ) : (
            <div className="text-xs text-zinc-500">
              Awaiting receiving
            </div>
          )}
        </div>
      );
    }

    if (order.status === "received") {
      return (
        <div className="inline-flex items-center gap-2 text-xs text-emerald-300">
          <PackageCheck size={14} />

          Fully received
        </div>
      );
    }

    if (order.status === "cancelled") {
      return (
        <div className="text-xs text-red-300">
          Cancelled
        </div>
      );
    }

    return null;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-3 text-zinc-400">
            <RefreshCw size={18} className="animate-spin" />

            Loading purchase orders...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-2 text-blue-300">
                <ClipboardList size={22} />
              </div>

              <h1 className="text-2xl font-semibold tracking-tight">
                Purchase Orders
              </h1>
            </div>

            <p className="text-sm text-zinc-400">
              Create, approve, order, receive, and track procurement.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refreshOrders()}
              disabled={refreshing || !organizationId}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />

              Refresh
            </button>

            {canCreate && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                <Plus size={16} />

                Create Purchase Order
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />

            <span>{error}</span>
          </div>
        )}

        {actionError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />

            <span>{actionError}</span>
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard
            label="Total"
            value={stats.total}
            icon={<ClipboardList size={17} />}
          />

          <StatCard
            label="Draft"
            value={stats.draft}
            icon={<Clock3 size={17} />}
          />

          <StatCard
            label="Pending"
            value={stats.pending}
            icon={<Send size={17} />}
          />

          <StatCard
            label="Approved"
            value={stats.approved}
            icon={<Check size={17} />}
          />

          <StatCard
            label="Ordered"
            value={stats.ordered}
            icon={<ShoppingCart size={17} />}
          />

          <StatCard
            label="Received"
            value={stats.received}
            icon={<PackageCheck size={17} />}
          />
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70">
          <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 lg:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search supplier, item, SKU, or PO ID..."
              className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500"
            />

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as PurchaseOrderStatus | "all",
                  )
                }
                className="appearance-none rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-3 pr-9 text-sm text-zinc-300 outline-none focus:border-blue-500"
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="pending_approval">
                  Pending Approval
                </option>
                <option value="approved">Approved</option>
                <option value="ordered">Ordered</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList
                size={32}
                className="mx-auto mb-3 text-zinc-700"
              />

              <p className="text-sm font-medium text-zinc-300">
                No purchase orders found.
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Create a purchase order to start the procurement workflow.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filteredOrders.map((order) => {
                const supplier = supplierMap.get(order.supplier_id);
                const orderTotal = getOrderTotal(order);

                return (
                  <div
                    key={order.id}
                    className="p-5 transition hover:bg-white/[0.02]"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm text-zinc-200">
                            PO-{order.id.slice(0, 8).toUpperCase()}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasses(
                              order.status,
                            )}`}
                          >
                            {STATUS_LABELS[order.status]}
                          </span>
                        </div>

                        <div className="mt-2">
                          <p className="font-medium text-zinc-100">
                            {supplier?.name ?? "Unknown supplier"}
                          </p>

                          {order.notes && (
                            <p className="mt-1 text-xs text-zinc-500">
                              {order.notes}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
                          <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-zinc-800 bg-zinc-950/60 px-3 py-2 text-[11px] uppercase tracking-wide text-zinc-600">
                            <span>Item</span>
                            <span>Qty</span>
                            <span>Received</span>
                          </div>

                          {order.items.map((line) => {
                            const item = itemMap.get(line.item_id);
                            const remaining =
                              line.quantity - line.received_quantity;

                            return (
                              <div
                                key={line.id}
                                className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-zinc-800/70 px-3 py-3 text-sm last:border-b-0"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-zinc-200">
                                    {item?.name ?? "Unknown item"}
                                  </p>

                                  <p className="text-xs text-zinc-600">
                                    {item?.sku ?? line.item_id}
                                  </p>

                                  {order.status === "ordered" &&
                                    remaining > 0 && (
                                      <p className="mt-1 text-[11px] text-violet-300">
                                        {remaining} remaining
                                      </p>
                                    )}
                                </div>

                                <span className="text-zinc-400">
                                  {line.quantity}
                                </span>

                                <span className="text-zinc-400">
                                  {line.received_quantity}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-start gap-4 xl:items-end">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs xl:text-right">
                          <div>
                            <p className="text-zinc-600">Expected</p>

                            <p className="mt-1 text-zinc-300">
                              {formatDate(order.expected_date)}
                            </p>
                          </div>

                          <div>
                            <p className="text-zinc-600">Created</p>

                            <p className="mt-1 text-zinc-300">
                              {formatDateTime(order.created_at)}
                            </p>
                          </div>

                          <div>
                            <p className="text-zinc-600">Value</p>

                            <p className="mt-1 text-zinc-300">
                              {orderTotal.hasPrices
                                ? formatCurrency(orderTotal.total)
                                : "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-zinc-600">Items</p>

                            <p className="mt-1 text-zinc-300">
                              {order.items.length}
                            </p>
                          </div>
                        </div>

                        <div className="w-full xl:w-auto">
                          {renderWorkflowActions(order)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-zinc-100">
                    Create Purchase Order
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    New orders start in Draft status.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200 disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={handleCreatePurchaseOrder}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                  {actionError && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                      <AlertCircle
                        size={17}
                        className="mt-0.5 shrink-0"
                      />

                      <span>{actionError}</span>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-medium text-zinc-400">
                        Supplier
                      </span>

                      <select
                        value={selectedSupplierId}
                        onChange={(event) =>
                          setSelectedSupplierId(event.target.value)
                        }
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500"
                      >
                        <option value="">Select supplier</option>

                        {suppliers.map((supplier) => (
                          <option
                            key={supplier.id}
                            value={supplier.id}
                          >
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-medium text-zinc-400">
                        Expected date
                      </span>

                      <input
                        type="datetime-local"
                        value={expectedDate}
                        onChange={(event) =>
                          setExpectedDate(event.target.value)
                        }
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-xs font-medium text-zinc-400">
                      Notes
                    </span>

                    <textarea
                      value={notes}
                      onChange={(event) =>
                        setNotes(event.target.value)
                      }
                      rows={3}
                      placeholder="Optional procurement notes..."
                      className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500"
                    />
                  </label>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-zinc-200">
                          Order items
                        </h3>

                        <p className="mt-1 text-xs text-zinc-600">
                          Each item can appear only once.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={addItemLine}
                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800"
                      >
                        <Plus size={14} />

                        Add item
                      </button>
                    </div>

                    <div className="space-y-3">
                      {itemLines.map((line, index) => (
                        <div
                          key={index}
                          className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:grid-cols-[1fr_120px_140px_auto]"
                        >
                          <select
                            value={line.item_id}
                            onChange={(event) =>
                              updateItemLine(
                                index,
                                "item_id",
                                event.target.value,
                              )
                            }
                            className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500"
                          >
                            <option value="">Select item</option>

                            {items.map((item) => (
                              <option
                                key={item.id}
                                value={item.id}
                              >
                                {item.name} ({item.sku})
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={line.quantity}
                            onChange={(event) =>
                              updateItemLine(
                                index,
                                "quantity",
                                event.target.value,
                              )
                            }
                            placeholder="Qty"
                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500"
                          />

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(event) =>
                              updateItemLine(
                                index,
                                "unit_price",
                                event.target.value,
                              )
                            }
                            placeholder="Unit price"
                            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500"
                          />

                          <button
                            type="button"
                            onClick={() => removeItemLine(index)}
                            disabled={itemLines.length === 1}
                            className="inline-flex items-center justify-center rounded-lg border border-zinc-800 px-3 py-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-zinc-800 bg-zinc-950 px-5 py-4">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    disabled={creating}
                    className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
                  >
                    Close
                  </button>

                  <button
                    type="submit"
                    disabled={creating || !organizationId}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={16} />

                    {creating ? "Creating..." : "Create Draft PO"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showReceiveModal && selectedReceiveOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300">
                      <PackageCheck size={18} />
                    </div>

                    <div>
                      <h2 className="font-semibold text-zinc-100">
                        Receive Purchase Order
                      </h2>

                      <p className="mt-1 text-xs text-zinc-500">
                        PO-
                        {selectedReceiveOrder.id
                          .slice(0, 8)
                          .toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeReceiveModal}
                  disabled={receiving}
                  className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200 disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={handleReceivePurchaseOrder}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                  {receiveError && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                      <AlertCircle
                        size={17}
                        className="mt-0.5 shrink-0"
                      />

                      <span>{receiveError}</span>
                    </div>
                  )}

                  {locations.length === 0 && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
                      <AlertCircle
                        size={17}
                        className="mt-0.5 shrink-0"
                      />

                      <span>
                        No inventory locations are available. Create a
                        location before receiving stock.
                      </span>
                    </div>
                  )}

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-zinc-200">
                        Outstanding items
                      </h3>

                      <p className="mt-1 text-xs text-zinc-600">
                        Enter the quantity, destination location, lot number,
                        and optional expiry date for each receipt.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {receiveLines.map((line, index) => {
                        const poItem =
                          selectedReceiveOrder.items.find(
                            (item) =>
                              item.id === line.purchase_order_item_id,
                          );

                        if (!poItem) {
                          return null;
                        }

                        const item = itemMap.get(poItem.item_id);
                        const remaining =
                          poItem.quantity - poItem.received_quantity;

                        return (
                          <div
                            key={line.purchase_order_item_id}
                            className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
                          >
                            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-medium text-zinc-200">
                                  {item?.name ?? "Unknown item"}
                                </p>

                                <p className="text-xs text-zinc-600">
                                  {item?.sku ?? poItem.item_id}
                                </p>
                              </div>

                              <div className="text-xs text-zinc-500 sm:text-right">
                                Ordered:{" "}
                                <span className="text-zinc-300">
                                  {poItem.quantity}
                                </span>
                                {" · "}
                                Received:{" "}
                                <span className="text-zinc-300">
                                  {poItem.received_quantity}
                                </span>
                                {" · "}
                                Remaining:{" "}
                                <span className="text-violet-300">
                                  {remaining}
                                </span>
                              </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                              <label className="block">
                                <span className="mb-2 block text-xs font-medium text-zinc-400">
                                  Receive quantity
                                </span>

                                <input
                                  type="number"
                                  min="1"
                                  max={remaining}
                                  step="1"
                                  value={line.quantity}
                                  onChange={(event) =>
                                    updateReceiveLine(
                                      index,
                                      "quantity",
                                      event.target.value,
                                    )
                                  }
                                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500"
                                />
                              </label>

                              <label className="block">
                                <span className="mb-2 block text-xs font-medium text-zinc-400">
                                  Location
                                </span>

                                <select
                                  value={line.location_id}
                                  onChange={(event) =>
                                    updateReceiveLine(
                                      index,
                                      "location_id",
                                      event.target.value,
                                    )
                                  }
                                  disabled={locations.length === 0}
                                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <option value="">
                                    Select location
                                  </option>

                                  {locations.map((location) => (
                                    <option
                                      key={location.id}
                                      value={location.id}
                                    >
                                      {location.name}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="block">
                                <span className="mb-2 block text-xs font-medium text-zinc-400">
                                  Lot number
                                </span>

                                <input
                                  type="text"
                                  value={line.lot_number}
                                  onChange={(event) =>
                                    updateReceiveLine(
                                      index,
                                      "lot_number",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="e.g. LOT-2026-001"
                                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500"
                                />
                              </label>

                              <label className="block">
                                <span className="mb-2 block text-xs font-medium text-zinc-400">
                                  Expiry date
                                </span>

                                <input
                                  type="date"
                                  value={line.expiry_date}
                                  onChange={(event) =>
                                    updateReceiveLine(
                                      index,
                                      "expiry_date",
                                      event.target.value,
                                    )
                                  }
                                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500"
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-200">
                    <p className="font-medium">
                      Receiving creates inventory automatically.
                    </p>

                    <p className="mt-1 text-blue-300/70">
                      Each received quantity creates a RECEIVE stock movement
                      and an audit entry. Partial receipts keep the purchase
                      order in Ordered status until all quantities are
                      received.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 bg-zinc-950 px-5 py-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeReceiveModal}
                    disabled={receiving}
                    className="rounded-lg border border-zinc-800 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
                  >
                    Close
                  </button>

                  <button
                    type="submit"
                    disabled={
                      receiving ||
                      locations.length === 0 ||
                      receiveLines.length === 0 ||
                      !organizationId
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PackageCheck size={16} />

                    {receiving
                      ? "Receiving..."
                      : "Receive Stock"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {label}
        </span>

        <span className="text-zinc-600">
          {icon}
        </span>
      </div>

      <p className="mt-2 text-2xl font-semibold text-zinc-100">
        {value}
      </p>
    </div>
  );
}