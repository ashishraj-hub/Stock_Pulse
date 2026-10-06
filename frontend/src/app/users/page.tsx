"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  getCurrentUser,
  type CurrentUser,
} from "../lib/auth";

import {
  createUser,
  getUsers,
  type UserResponse,
} from "../lib/users";

type UserRole = "admin" | "staff" | "viewer";

export default function UsersPage() {
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [users, setUsers] =
    useState<UserResponse[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("staff");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        setError("");

        const user = await getCurrentUser();

        setCurrentUser(user);

        if (user.role !== "admin") {
          setLoading(false);
          return;
        }

        const userList = await getUsers(
          user.organization_id,
        );

        setUsers(userList);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load users",
        );
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

  async function handleCreateUser(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!currentUser) {
      setError("User session not available.");
      return;
    }

    if (currentUser.role !== "admin") {
      setError(
        "Only administrators can create users.",
      );
      return;
    }

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters.",
      );
      return;
    }

    try {
      setCreating(true);

      const newUser = await createUser(
        currentUser.organization_id,
        {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        },
      );

      setUsers((previousUsers) => [
        ...previousUsers,
        newUser,
      ]);

      setName("");
      setEmail("");
      setPassword("");
      setRole("staff");

      setSuccess(
        `User "${newUser.name}" was created successfully.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create user.",
      );
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-2xl border border-slate-700 bg-slate-900 px-6 py-5 shadow-xl">
          <p className="font-medium">
            Loading users...
          </p>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100 sm:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-6">
            <h1 className="text-2xl font-bold text-white">
              User Management
            </h1>

            <p className="mt-3 text-red-200">
              Unable to load current user.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (currentUser.role !== "admin") {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-slate-100 sm:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-400">
              StockPulse
            </p>

            <h1 className="mt-2 text-3xl font-bold text-white">
              User Management
            </h1>

            <p className="mt-2 text-slate-300">
              Manage users within your organization.
            </p>
          </header>

          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-6">
            <p className="font-bold text-red-300">
              Access denied
            </p>

            <p className="mt-2 text-sm text-red-200">
              Only administrators can manage users.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const adminCount = users.filter(
    (user) => user.role === "admin",
  ).length;

  const staffCount = users.filter(
    (user) => user.role === "staff",
  ).length;

  const viewerCount = users.filter(
    (user) => user.role === "viewer",
  ).length;

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
                User Management
              </h1>

              <p className="mt-2 text-slate-300">
                Create and manage users in your organization.
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Signed in as
              </p>

              <p className="mt-1 font-bold text-white">
                {currentUser.name}
              </p>

              <p className="mt-1 text-xs font-semibold text-purple-300">
                ADMIN
              </p>
            </div>
          </div>
        </header>

        {/* Summary */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Total Users"
            value={users.length}
            accent="cyan"
          />

          <SummaryCard
            label="Administrators"
            value={adminCount}
            accent="violet"
          />

          <SummaryCard
            label="Staff"
            value={staffCount}
            accent="blue"
          />

          <SummaryCard
            label="Viewers"
            value={viewerCount}
            accent="slate"
          />
        </section>

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4">
            <p className="text-sm font-semibold text-red-200">
              {error}
            </p>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4">
            <p className="text-sm font-semibold text-emerald-200">
              {success}
            </p>
          </div>
        )}

        {/* Create user */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
          <div className="border-b border-slate-700 pb-5">
            <h2 className="text-xl font-bold text-white">
              Create New User
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Add a new user to this organization.
            </p>
          </div>

          <form
            onSubmit={handleCreateUser}
            className="mt-6"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-slate-300"
                >
                  Name
                </label>

                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="John Doe"
                  className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-slate-300"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="john@example.com"
                  className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-300"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Minimum 8 characters"
                  className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Minimum 8 characters.
                </p>
              </div>

              {/* Role */}
              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-semibold text-slate-300"
                >
                  Role
                </label>

                <select
                  id="role"
                  value={role}
                  onChange={(event) =>
                    setRole(
                      event.target.value as UserRole,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                >
                  <option value="admin">
                    Admin
                  </option>

                  <option value="staff">
                    Staff
                  </option>

                  <option value="viewer">
                    Viewer
                  </option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl border border-cyan-400/30 bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating
                  ? "Creating..."
                  : "Create User"}
              </button>
            </div>
          </form>
        </section>

        {/* Existing users */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-xl">
          <div className="border-b border-slate-700 px-6 py-5">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Organization Users
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Users belonging to this organization.
                </p>
              </div>

              <div className="text-sm text-slate-400">
                {users.length} user
                {users.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-slate-400">
                No users found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[850px] w-full text-left text-sm">
                <thead className="border-b border-slate-700 bg-slate-950">
                  <tr>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Email</TableHeader>
                    <TableHeader>Role</TableHeader>
                    <TableHeader>Created</TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="transition hover:bg-slate-800/60"
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">
                          {user.name}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-slate-300">
                        {user.email}
                      </td>

                      <td className="px-6 py-4">
                        <RoleBadge role={user.role} />
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-400">
                        {new Date(
                          user.created_at,
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
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
  accent,
}: {
  label: string;
  value: number;
  accent: "cyan" | "violet" | "blue" | "slate";
}) {
  const borderClasses = {
    cyan: "border-cyan-500/30",
    violet: "border-violet-500/30",
    blue: "border-blue-500/30",
    slate: "border-slate-600",
  };

  const valueClasses = {
    cyan: "text-cyan-300",
    violet: "text-violet-300",
    blue: "text-blue-300",
    slate: "text-slate-200",
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

function RoleBadge({
  role,
}: {
  role: string;
}) {
  const normalizedRole = role.toLowerCase();

  const classes =
    normalizedRole === "admin"
      ? "border-violet-500/30 bg-violet-950 text-violet-300"
      : normalizedRole === "staff"
        ? "border-blue-500/30 bg-blue-950 text-blue-300"
        : "border-slate-600 bg-slate-800 text-slate-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${classes}`}
    >
      {role}
    </span>
  );
}

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-400">
      {children}
    </th>
  );
}