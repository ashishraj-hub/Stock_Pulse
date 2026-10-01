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
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-gray-600">
            Loading users...
          </p>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-red-600">
            Unable to load current user.
          </p>
        </div>
      </main>
    );
  }

  if (currentUser.role !== "admin") {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">
            User Management
          </h1>

          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="font-semibold text-red-800">
              Access denied
            </p>

            <p className="mt-1 text-sm text-red-700">
              Only administrators can manage users.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            User Management
          </h1>

          <p className="mt-2 text-gray-600">
            Create and manage users in your
            organization.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-700">
              {success}
            </p>
          </div>
        )}

        {/* Create user */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Create New User
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Add a new user to this organization.
          </p>

          <form
            onSubmit={handleCreateUser}
            className="mt-6"
          >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
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
                  className="mt-2 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
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
                  className="mt-2 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
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
                  className="mt-2 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              {/* Role */}
              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-medium text-gray-700"
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
                  className="mt-2 w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
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

            <div className="mt-6">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating
                  ? "Creating..."
                  : "Create User"}
              </button>
            </div>
          </form>
        </section>

        {/* Existing users */}
        <section className="mt-8 rounded-xl border bg-white shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-xl font-bold">
              Organization Users
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Users belonging to this organization.
            </p>
          </div>

          {users.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-semibold">
                      Name
                    </th>

                    <th className="px-6 py-3 font-semibold">
                      Email
                    </th>

                    <th className="px-6 py-3 font-semibold">
                      Role
                    </th>

                    <th className="px-6 py-3 font-semibold">
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-6 py-4 font-medium">
                        {user.name}
                      </td>

                      <td className="px-6 py-4">
                        {user.email}
                      </td>

                      <td className="px-6 py-4">
                        <RoleBadge
                          role={user.role}
                        />
                      </td>

                      <td className="px-6 py-4 text-gray-500">
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

function RoleBadge({
  role,
}: {
  role: string;
}) {
  const classes =
    role === "admin"
      ? "bg-purple-100 text-purple-700"
      : role === "staff"
        ? "bg-blue-100 text-blue-700"
        : "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes}`}
    >
      {role}
    </span>
  );
}