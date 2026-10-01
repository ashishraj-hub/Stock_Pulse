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
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-gray-600">
            Loading audit logs...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-red-600">
            Unable to load current user.
          </p>
        </div>
      </main>
    );
  }

  if (user.role !== "admin") {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold">
            Audit Log
          </h1>

          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-800">
              Access denied
            </p>

            <p className="mt-1 text-sm text-red-700">
              Only administrators can view the audit log.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold">
            Audit Log
          </h1>

          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
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
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Audit Log
          </h1>

          <p className="mt-2 text-gray-600">
            Review important actions performed
            within your organization.
          </p>
        </div>

        {/* Summary */}
        <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total recorded events
          </p>

          <p className="mt-1 text-3xl font-bold">
            {total}
          </p>
        </div>

        {/* Audit table */}
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                No audit events found.
              </p>
            </div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-5 py-4 font-semibold">
                    Date
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Action
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Entity
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Entity ID
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    User ID
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Details
                  </th>
                </tr>
              </thead>

              <tbody>
                {auditLogs.map((log) => (
                  <AuditRow
                    key={log.id}
                    log={log}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1),
                )
              }
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
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
    <tr className="border-b last:border-b-0">
      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
        {new Date(
          log.created_at,
        ).toLocaleString()}
      </td>

      <td className="px-5 py-4">
        <ActionBadge action={log.action} />
      </td>

      <td className="px-5 py-4 font-medium">
        {log.entity_type}
      </td>

      <td className="px-5 py-4">
        <span className="font-mono text-xs text-gray-600">
          {log.entity_id || "—"}
        </span>
      </td>

      <td className="px-5 py-4">
        <span className="font-mono text-xs text-gray-600">
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
  let classes =
    "bg-gray-100 text-gray-700";

  if (action.includes("create")) {
    classes =
      "bg-green-100 text-green-700";
  } else if (
    action.includes("receive")
  ) {
    classes =
      "bg-blue-100 text-blue-700";
  } else if (
    action.includes("issue")
  ) {
    classes =
      "bg-orange-100 text-orange-700";
  } else if (
    action.includes("wastage")
  ) {
    classes =
      "bg-red-100 text-red-700";
  } else if (
    action.includes("transfer")
  ) {
    classes =
      "bg-purple-100 text-purple-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes}`}
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
      <span className="text-gray-400">
        —
      </span>
    );
  }

  try {
    const parsed = JSON.parse(details);

    return (
      <pre className="max-w-md overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
        {JSON.stringify(
          parsed,
          null,
          2,
        )}
      </pre>
    );
  } catch {
    return (
      <span className="text-xs text-gray-600">
        {details}
      </span>
    );
  }
}