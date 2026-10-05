"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getCurrentUser,
  login,
  saveAccessToken,
} from "./lib/auth";

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("Logging in...");

    try {
      const result = await login({
        email,
        password,
      });

      saveAccessToken(result.access_token);

      const user = await getCurrentUser();

      setMessage(
        `Welcome ${user.name}. Redirecting...`,
      );

      router.push("/dashboard");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Login failed",
      );
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">
          StockPulse
        </h1>

        <p className="text-gray-600 mb-6">
          Inventory management system
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="email"
              className="block mb-1 font-medium"
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
              className="w-full border rounded-lg p-3"
              placeholder="admin@stockpulse.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block mb-1 font-medium"
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
              className="w-full border rounded-lg p-3"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg p-3 font-medium bg-black text-white"
          >
            Login
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}