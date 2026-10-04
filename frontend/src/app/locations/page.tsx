"use client";

import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  Plus,
  RefreshCw,
  Warehouse,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createLocation,
  getLocations,
  type Location,
} from "../lib/locations";
import {
  getCurrentUser,
  type CurrentUser,
} from "../lib/auth";


export default function LocationsPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [name, setName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    try {
      setLoading(true);
      setError(null);

      const currentUser = await getCurrentUser();

      setUser(currentUser);

      const locationList = await getLocations(
        currentUser.organization_id,
      );

      setLocations(locationList);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load locations.",
      );
    } finally {
      setLoading(false);
    }
  }

  const duplicateName = useMemo(() => {
    const normalizedName = name.trim().toLowerCase();

    if (!normalizedName) {
      return false;
    }

    return locations.some(
      (location) =>
        location.name.trim().toLowerCase() ===
        normalizedName,
    );
  }, [name, locations]);

  function openCreateModal() {
    setName("");
    setFormError(null);
    setError(null);
    setSuccess(null);
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    if (creating) {
      return;
    }

    setShowCreateModal(false);
    setName("");
    setFormError(null);
  }

  async function handleCreateLocation(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFormError(null);
    setError(null);
    setSuccess(null);

    if (!user) {
      setFormError(
        "Authenticated user information is not available.",
      );
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormError("Location name is required.");
      return;
    }

    if (duplicateName) {
      setFormError(
        "A location with this name already exists.",
      );
      return;
    }

    try {
      setCreating(true);

      const createdLocation = await createLocation(
        user.organization_id,
        {
          name: trimmedName,
        },
      );

      setLocations((current) => [
        ...current,
        createdLocation,
      ]);

      setShowCreateModal(false);
      setName("");

      setSuccess(
        `Location "${createdLocation.name}" was created successfully.`,
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to create location.";

      if (
        message.toLowerCase().includes("already exists")
      ) {
        setFormError(
          "A location with this name already exists.",
        );
      } else {
        setFormError(message);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400">
                <Warehouse className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold text-white">
                  Locations
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  Manage warehouses, stores, rooms, and other
                  inventory locations.
                </p>
              </div>
            </div>
          </div>

          {user?.role === "admin" && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Add Location
            </button>
          )}
        </div>

        {/* Success */}
        {success && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              {success}
            </div>

            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="text-emerald-400 hover:text-emerald-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error */}
        {error && !showCreateModal && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              {error}
            </div>

            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main Card */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white">
                All Locations
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {locations.length}{" "}
                {locations.length === 1
                  ? "location"
                  : "locations"}
              </p>
            </div>

            <button
              type="button"
              onClick={loadLocations}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading locations...
              </div>
            </div>
          ) : locations.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-slate-500">
                <MapPin className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-white">
                No locations yet
              </h3>

              <p className="mt-2 max-w-md text-sm text-slate-500">
                Create your first inventory location before
                receiving or transferring stock.
              </p>

              {user?.role === "admin" && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  <Plus className="h-4 w-4" />
                  Add Location
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">
                      Location
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Created
                    </th>

                    <th className="px-5 py-3 font-medium">
                      ID
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {locations.map((location) => (
                    <tr
                      key={location.id}
                      className="border-b border-slate-800/70 last:border-b-0 hover:bg-slate-800/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400">
                            <MapPin className="h-4 w-4" />
                          </div>

                          <div>
                            <div className="text-sm font-medium text-white">
                              {location.name}
                            </div>

                            <div className="text-xs text-slate-500">
                              Inventory location
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-400">
                        {new Date(
                          location.created_at,
                        ).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-4">
                        <code className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-400">
                          {location.id}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Permissions */}
        {user && user.role !== "admin" && (
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-xs text-slate-500">
            You can view locations, but only organization
            administrators can create new locations.
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Add Location
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Create a new inventory location.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creating}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateLocation}
              className="space-y-5 p-5"
            >
              {formError && (
                <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <div className="flex-1">
                    <div className="font-semibold text-red-200">
                      Cannot create location
                    </div>

                    <div className="mt-1">
                      {formError}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormError(null)}
                    className="text-red-400 hover:text-red-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div>
                <label
                  htmlFor="location-name"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Location Name
                </label>

                <input
                  id="location-name"
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g. Main Warehouse"
                  autoFocus
                  className={`w-full rounded-lg border bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:ring-2 ${
                    duplicateName
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />

                {duplicateName && (
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />

                    <span>
                      A location with this name already
                      exists.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    creating ||
                    duplicateName ||
                    !name.trim()
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating && (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  )}

                  {creating
                    ? "Creating..."
                    : "Create Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}