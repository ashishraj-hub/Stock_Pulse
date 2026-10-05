"use client";

import { useEffect, useState } from "react";

import {
  getCurrentUser,
  type CurrentUser,
} from "../lib/auth";

import {
  getAuditLogs,
  type AuditLog,
} from "../lib/audit";

export default function AuditPage() {
  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [auditLogs, setAuditLogs] =
    useState<AuditLog[]>([]);

  const [page, setPage] = useState(1);

  const [pageSize] = useState(50);

  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAuditLogs() {
      try {
        setLoading(true);
        setError("");

        const currentUser =
          await getCurrentUser();

        setUser(currentUser);

        if (currentUser.role !== "admin") {
          setLoading(false);
          return;
        }

        const response =
          await getAuditLogs(
            currentUser.organization_id,
            page,
            pageSize,
          );

        setAuditLogs(response.items);
        setTotal(response.total);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load audit logs",
        );
      } finally {
        setLoading(false);
      }
    }

    loadAuditLogs();
  }, [page, pageSize]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-5 shadow-xl">
          <p className="font-medium">
            Loading audit logs...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100 sm:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-6">
            <h1 className="text-2xl font-bold text-white">
              Audit Log
            </h1>

            <p className="mt-3 text-red-200">
              Unable to load current user.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (user.role !== "admin") {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100 sm:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-400">
              StockPulse
            </p>

            <h1 className="mt-2 text-3xl font-bold text-white">
              Audit Log
            </h1>

            <p className="mt-2 text-slate-300">
              Review important actions performed within your organization.
            </p>
          </header>

          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-6">
            <p className="font-bold text-red-300">
              Access denied
            </p>

            <p className="mt-2 text-sm text-red-200">
              Only administrators can view the audit log.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100 sm:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-400">
              StockPulse
            </p>

            <h1 className="mt-2 text-3xl font-bold text-white">
              Audit Log
            </h1>
          </header>

          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-5">
            <p className="text-sm font-semibold text-red-200">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const totalPages =
    total === 0
      ? 1
      : Math.ceil(total / pageSize);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-400">
                StockPulse
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Audit Log
              </h1>

              <p className="mt-2 text-slate-300">
                Review important actions performed within your organization.
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Access
              </p>

              <p className="mt-1 font-bold text-white">
                {user.name}
              </p>

              <p className="mt-1 text-xs font-semibold text-violet-300">
                ADMIN ONLY
              </p>
            </div>
          </div>
        </header>

        {/* Summary */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total Events"
            value={total}
            accent="cyan"
          />

          <SummaryCard
            label="Current Page"
            value={auditLogs.length}
            accent="blue"
          />

          <SummaryCard
            label="Page"
            value={page}
            accent="violet"
          />
        </section>

        {/* Audit table */}
        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-700 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-white">
                Activity History
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Showing up to {pageSize} events per page.
              </p>
            </div>

            <div className="text-sm text-slate-400">
              {total} recorded event
              {total === 1 ? "" : "s"}
            </div>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-bold text-white">
                No audit events found.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                There are currently no audit records for this organization.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1350px] w-full text-left text-sm">
                <thead className="border-b border-slate-700 bg-slate-950">
                  <tr>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Action</TableHeader>
                    <TableHeader>Entity</TableHeader>
                    <TableHeader>Entity ID</TableHeader>
                    <TableHeader>User ID</TableHeader>
                    <TableHeader>Details</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {auditLogs.map((log) => (
                    <AuditRow
                      key={log.id}
                      log={log}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Pagination */}
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              Page {page} of {totalPages}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {total} total audit event
              {total === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1),
                )
              }
              className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(
                    totalPages,
                    current + 1,
                  ),
                )
              }
              className="rounded-xl border border-cyan-500/30 bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function AuditRow({
  log,
}: {
  log: AuditLog;
}) {
  return (
    <tr className="transition hover:bg-slate-800/60">
      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-400">
        {new Date(
          log.created_at,
        ).toLocaleString()}
      </td>

      <td className="px-5 py-4">
        <ActionBadge action={log.action} />
      </td>

      <td className="px-5 py-4">
        <span className="font-bold text-white">
          {log.entity_type}
        </span>
      </td>

      <td className="px-5 py-4">
        <span className="rounded-md bg-slate-950 px-2 py-1 font-mono text-xs text-cyan-300">
          {log.entity_id || "—"}
        </span>
      </td>

      <td className="px-5 py-4">
        <span className="rounded-md bg-slate-950 px-2 py-1 font-mono text-xs text-slate-400">
          {log.user_id || "—"}
        </span>
      </td>

      <td className="max-w-md px-5 py-4">
        <AuditDetails
          details={log.details}
        />
      </td>
    </tr>
  );
}

function ActionBadge({
  action,
}: {
  action: string;
}) {
  const normalized = action.toLowerCase();

  let classes =
    "border-slate-600 bg-slate-800 text-slate-300";

  if (normalized.includes("create")) {
    classes =
      "border-emerald-500/30 bg-emerald-950 text-emerald-300";
  } else if (normalized.includes("receive")) {
    classes =
      "border-blue-500/30 bg-blue-950 text-blue-300";
  } else if (normalized.includes("issue")) {
    classes =
      "border-orange-500/30 bg-orange-950 text-orange-300";
  } else if (normalized.includes("wastage")) {
    classes =
      "border-red-500/30 bg-red-950 text-red-300";
  } else if (normalized.includes("transfer")) {
    classes =
      "border-violet-500/30 bg-violet-950 text-violet-300";
  } else if (normalized.includes("adjust")) {
    classes =
      "border-amber-500/30 bg-amber-950 text-amber-300";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${classes}`}
    >
      {action}
    </span>
  );
}

function AuditDetails({
  details,
}: {
  details: string | null;
}) {
  if (!details) {
    return (
      <span className="text-slate-600">
        —
      </span>
    );
  }

  try {
    const parsed = JSON.parse(details);

    return (
      <pre className="max-w-md overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300">
        {JSON.stringify(
          parsed,
          null,
          2,
        )}
      </pre>
    );
  } catch {
    return (
      <span className="text-xs text-slate-400">
        {details}
      </span>
    );
  }
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "cyan" | "blue" | "violet";
}) {
  const borderClasses = {
    cyan: "border-cyan-500/30",
    blue: "border-blue-500/30",
    violet: "border-violet-500/30",
  };

  const valueClasses = {
    cyan: "text-cyan-300",
    blue: "text-blue-300",
    violet: "text-violet-300",
  };

  return (
    <div
      className={`rounded-2xl border bg-slate-900 p-5 shadow-lg ${borderClasses[accent]}`}
    >
      <p className="text-sm font-semibold text-slate-400">
        {label}
      </p>

      <p
        className={`mt-3 text-4xl font-black ${valueClasses[accent]}`}
      >
        {value}
      </p>
    </div>
  );
}

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-400">
      {children}
    </th>
  );
}