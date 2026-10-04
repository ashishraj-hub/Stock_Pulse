"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Truck,
  UserRound,
  X,
} from "lucide-react";

import { getCurrentUser } from "../lib/auth";
import {
  createSupplier,
  getSuppliers,
  Supplier,
} from "../lib/suppliers";

interface CurrentUser {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: "admin" | "staff" | "viewer";
}

interface SupplierForm {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
}

const emptyForm: SupplierForm = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function SuppliersPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");

  async function loadSuppliers(organizationId: string) {
    setLoadingSuppliers(true);
    setError("");

    try {
      const data = await getSuppliers(organizationId);
      setSuppliers(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load suppliers.",
      );
    } finally {
      setLoadingSuppliers(false);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const currentUser = await getCurrentUser();

        if (!currentUser) {
          setError("You are not logged in.");
          return;
        }

        setUser(currentUser);

        await loadSuppliers(currentUser.organization_id);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load supplier management.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return suppliers;
    }

    return suppliers.filter((supplier) => {
      return [
        supplier.name,
        supplier.contact_name,
        supplier.email,
        supplier.phone,
        supplier.address,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query),
        );
    });
  }, [suppliers, search]);

  const duplicateName = useMemo(() => {
    const normalized = form.name.trim().toLowerCase();

    if (!normalized) {
      return false;
    }

    return suppliers.some(
      (supplier) =>
        supplier.name.trim().toLowerCase() === normalized,
    );
  }, [form.name, suppliers]);

  function openCreateModal() {
    setForm(emptyForm);
    setFormError("");
    setSuccessMessage("");
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    if (creating) {
      return;
    }

    setShowCreateModal(false);
    setForm(emptyForm);
    setFormError("");
  }

  async function handleCreateSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setFormError("User information is unavailable.");
      return;
    }

    const name = form.name.trim();

    if (!name) {
      setFormError("Supplier name is required.");
      return;
    }

    if (duplicateName) {
      setFormError(
        "A supplier with this name already exists.",
      );
      return;
    }

    setCreating(true);
    setFormError("");
    setSuccessMessage("");

    try {
      const createdSupplier = await createSupplier(
        user.organization_id,
        {
          name,
          contact_name:
            form.contact_name.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
        },
      );

      setSuppliers((current) => [
        ...current,
        createdSupplier,
      ]);

      setShowCreateModal(false);
      setForm(emptyForm);

      setSuccessMessage(
        `${createdSupplier.name} was added successfully.`,
      );
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Failed to create supplier.",
      );
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-32">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading suppliers...
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error || "Unable to load the current user."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-600">
                <Truck className="h-4 w-4" />
                Procurement
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Suppliers
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Manage the suppliers used for purchase orders
                and stock procurement.
              </p>
            </div>

            {user.role === "admin" && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Add Supplier
              </button>
            )}
          </div>
        </section>

        {/* Success */}
        {successMessage && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Total Suppliers
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {suppliers.length}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Building2 className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  With Contact Person
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {
                    suppliers.filter(
                      (supplier) => supplier.contact_name,
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                <UserRound className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  With Email
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {
                    suppliers.filter(
                      (supplier) => supplier.email,
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <Mail className="h-6 w-6" />
              </div>
            </div>
          </div>
        </section>

        {/* Supplier list */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Supplier Directory
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredSuppliers.length} supplier
                  {filteredSuppliers.length === 1 ? "" : "s"} shown
                </p>
              </div>

              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search suppliers..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {loadingSuppliers ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading suppliers...
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Truck className="h-7 w-7 text-slate-400" />
              </div>

              <h3 className="font-semibold text-slate-900">
                {search
                  ? "No suppliers found"
                  : "No suppliers yet"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                {search
                  ? "Try a different search term."
                  : user.role === "admin"
                    ? "Add your first supplier to prepare for purchase order management."
                    : "No suppliers have been added to this organization yet."}
              </p>

              {!search && user.role === "admin" && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Add Supplier
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4">Supplier</th>
                    <th className="px-5 py-4">Contact</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Phone</th>
                    <th className="px-5 py-4">Address</th>
                    <th className="px-5 py-4">Added</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <Building2 className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">
                              {supplier.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              Supplier
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {supplier.contact_name || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {supplier.email ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Mail className="h-4 w-4 text-slate-400" />
                            {supplier.email}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {supplier.phone ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="h-4 w-4 text-slate-400" />
                            {supplier.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="max-w-xs px-5 py-4">
                        {supplier.address ? (
                          <div className="flex items-start gap-2 text-sm text-slate-600">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            <span className="line-clamp-2">
                              {supplier.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(supplier.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {user.role !== "admin" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Only administrators can add suppliers. You can still
            view the supplier directory.
          </div>
        )}
      </div>

      {/* Create Supplier Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Add Supplier
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a supplier for future procurement and purchase
                  orders.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creating}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier}>
              <div className="space-y-5 p-6">

                {formError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Supplier Name *
                  </label>

                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="e.g. ABC Office Supplies"
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition ${
                      duplicateName
                        ? "border-red-300 bg-red-50 focus:border-red-400"
                        : "border-slate-200 bg-white focus:border-slate-400"
                    }`}
                    disabled={creating}
                  />

                  {duplicateName && (
                    <p className="mt-1.5 text-xs text-red-600">
                      A supplier with this name already exists.
                    </p>
                  )}
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Contact Person
                    </label>

                    <input
                      value={form.contact_name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          contact_name: event.target.value,
                        }))
                      }
                      placeholder="e.g. Rahul Sharma"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                      disabled={creating}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Email
                    </label>

                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="supplier@example.com"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                      disabled={creating}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Phone
                  </label>

                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    disabled={creating}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Address
                  </label>

                  <textarea
                    value={form.address}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                    placeholder="Supplier address"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    disabled={creating}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    creating ||
                    !form.name.trim() ||
                    duplicateName
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {creating ? "Creating..." : "Create Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}