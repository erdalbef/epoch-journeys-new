"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim().toLowerCase());
}

export function AgentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl =
    searchParams.get("callbackUrl") ?? "/b2b/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailNormalized = useMemo(
    () => email.trim().toLowerCase(),
    [email]
  );

  const emailError = useMemo(() => {
    if (!emailNormalized) return "Email is required.";
    if (!isValidEmail(emailNormalized))
      return "Please enter a valid email address.";
    return null;
  }, [emailNormalized]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (emailError) {
      setError(emailError);
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);

    const res = await signIn("credentials", {
      email: emailNormalized,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!res || res.error) {
      // ✅ Agent-specific messaging
      setError(
        "Invalid credentials or your account is still pending approval."
      );
      return;
    }

    router.push(callbackUrl);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          disabled={loading}
        />
        {emailError ? (
          <p className="text-xs text-red-600">{emailError}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Password</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          disabled={loading}
        />
      </div>

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}
