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

  async function handleCreateSupplier(
    event: FormEvent<HTMLFormElement>,
  ) {
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
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-center py-32">
          <div className="flex items-center gap-3 text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            Loading suppliers...
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-950/40 p-6 text-red-300">
          {error || "Unable to load the current user."}
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
                <Truck className="h-4 w-4" />
                Procurement
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white">
                Suppliers
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Manage suppliers used for purchase orders and stock
                procurement.
              </p>
            </div>

            {user.role === "admin" && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
              >
                <Plus className="h-4 w-4" />
                Add Supplier
              </button>
            )}
          </div>
        </section>

        {/* Success */}
        {successMessage && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Total Suppliers"
            value={suppliers.length}
            icon={<Building2 className="h-6 w-6" />}
            accent="cyan"
          />

          <StatCard
            label="With Contact Person"
            value={
              suppliers.filter(
                (supplier) => supplier.contact_name,
              ).length
            }
            icon={<UserRound className="h-6 w-6" />}
            accent="violet"
          />

          <StatCard
            label="With Email"
            value={
              suppliers.filter(
                (supplier) => supplier.email,
              ).length
            }
            icon={<Mail className="h-6 w-6" />}
            accent="emerald"
          />
        </section>

        {/* Supplier directory */}
        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
          <div className="border-b border-slate-700 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-bold text-white">
                  Supplier Directory
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredSuppliers.length} supplier
                  {filteredSuppliers.length === 1
                    ? ""
                    : "s"} shown
                </p>
              </div>

              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search suppliers..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
                />
              </div>
            </div>
          </div>

          {loadingSuppliers ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-400" />
              Loading suppliers...
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950">
                <Truck className="h-7 w-7 text-slate-500" />
              </div>

              <h3 className="font-bold text-white">
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
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
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
                  <tr className="border-b border-slate-700 bg-slate-950 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
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
                      className="border-b border-slate-800 last:border-b-0 hover:bg-slate-800/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-950/50 text-cyan-400">
                            <Building2 className="h-5 w-5" />
                          </div>

                          <div>
                            <p className="font-semibold text-white">
                              {supplier.name}
                            </p>

                            <p className="text-xs text-slate-600">
                              Supplier
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-300">
                        {supplier.contact_name || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {supplier.email ? (
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Mail className="h-4 w-4 text-slate-500" />
                            {supplier.email}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-600">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {supplier.phone ? (
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Phone className="h-4 w-4 text-slate-500" />
                            {supplier.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-600">
                            —
                          </span>
                        )}
                      </td>

                      <td className="max-w-xs px-5 py-4">
                        {supplier.address ? (
                          <div className="flex items-start gap-2 text-sm text-slate-300">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

                            <span className="line-clamp-2">
                              {supplier.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-600">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-400">
                        {formatDate(
                          supplier.created_at,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Permission notice */}
        {user.role !== "admin" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
            Only administrators can add suppliers. You can still
            view the supplier directory.
          </div>
        )}
      </div>

      {/* Create Supplier Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-white">
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
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier}>
              <div className="space-y-5 p-6">
                {formError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                    {formError}
                  </div>
                )}

                <DarkInput
                  label="Supplier Name *"
                  value={form.name}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      name: value,
                    }))
                  }
                  placeholder="e.g. ABC Office Supplies"
                  disabled={creating}
                  error={duplicateName}
                />

                {duplicateName && (
                  <p className="-mt-3 text-xs text-red-400">
                    A supplier with this name already exists.
                  </p>
                )}

                <div className="grid gap-5 md:grid-cols-2">
                  <DarkInput
                    label="Contact Person"
                    value={form.contact_name}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        contact_name: value,
                      }))
                    }
                    placeholder="e.g. Rahul Sharma"
                    disabled={creating}
                  />

                  <DarkInput
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        email: value,
                      }))
                    }
                    placeholder="supplier@example.com"
                    disabled={creating}
                  />
                </div>

                <DarkInput
                  label="Phone"
                  value={form.phone}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      phone: value,
                    }))
                  }
                  placeholder="+91 98765 43210"
                  disabled={creating}
                />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
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
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
                    disabled={creating}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-700 bg-slate-950 px-6 py-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  {creating
                    ? "Creating..."
                    : "Create Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: "cyan" | "violet" | "emerald";
}) {
  const styles = {
    cyan: {
      box: "border-cyan-500/20 bg-cyan-950/40",
      icon: "text-cyan-400",
    },
    violet: {
      box: "border-violet-500/20 bg-violet-950/40",
      icon: "text-violet-400",
    },
    emerald: {
      box: "border-emerald-500/20 bg-emerald-950/40",
      icon: "text-emerald-400",
    },
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-black text-white">
            {value}
          </p>
        </div>

        <div
          className={`rounded-xl border p-3 ${styles[accent].box} ${styles[accent].icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function DarkInput({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
  error = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  type?: string;
  error?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-300">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full rounded-xl border bg-slate-950 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 ${
          error
            ? "border-red-500/60 focus:border-red-400"
            : "border-slate-700 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
        }`}
      />
    </div>
  );
}