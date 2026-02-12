"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AgentSignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/agents/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // Attempt JSON, but don’t assume it exists (404 often returns HTML)
      let data: unknown = null;
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          `Request failed (${res.status}). Non-JSON response: ${text.slice(0, 120)}`
        );
      }

      const parsed = data as { ok?: boolean; error?: string };

      if (!res.ok || !parsed.ok) {
        setError(parsed.error ?? `Request failed (${res.status})`);
        return;
      }

      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center space-y-3">
        <h2 className="text-lg font-semibold">Request received</h2>
        <p className="text-sm text-muted-foreground">
          Your partnership request has been submitted.
          <br />
          Our team will review and approve your access shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Password</label>
        <Input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Submitting..." : "Request Partnership"}
      </Button>
    </form>
  );
}
