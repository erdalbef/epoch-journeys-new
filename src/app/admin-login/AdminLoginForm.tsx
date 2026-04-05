"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim().toLowerCase());
}

export function AdminLoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("erdal@epochjourneys.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailNormalized = useMemo(() => email.trim().toLowerCase(), [email]);

  const emailError = useMemo(() => {
    if (!emailNormalized) return "Email is required.";
    if (!isValidEmail(emailNormalized)) {
      return "Please enter a valid email address.";
    }
    return null;
  }, [emailNormalized]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

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
      callbackUrl: "/admin/dashboard",
    });

    setLoading(false);

    if (!res || res.error || res.ok === false) {
      setError("Invalid admin credentials.");
      return;
    }

    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f8f8] px-6 py-16">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[#001F3F]">
            Admin Access
          </h1>
          <p className="mt-2 text-sm text-gray-600">Restricted access</p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label htmlFor="admin-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="admin-email"
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
            <label htmlFor="admin-password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </main>
  );
}