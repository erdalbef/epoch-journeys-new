"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function AgentLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/b2b/dashboard",
      });

      if (!result || result.error) {
        alert("Invalid email or password.");
        return;
      }

      window.location.href = result.url || "/b2b/dashboard";
    } catch (error) {
      console.error("AGENT_LOGIN_ERROR", error);
      alert("Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 w-full rounded border p-2"
          placeholder="agent@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 w-full rounded border p-2"
          placeholder="Enter your password"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-red-700 px-4 py-2 text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}