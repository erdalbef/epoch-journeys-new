"use client";

import { useMemo, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  callbackUrl: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim().toLowerCase());
}

export function AgentLoginForm({ callbackUrl }: Props) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
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
      callbackUrl,
    });

    setLoading(false);

    if (!res || res.error || res.ok === false) {
      setError("Invalid credentials or your account is still pending approval.");
      return;
    }

    router.push(res.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div className="space-y-2">
        <label htmlFor="agent-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="agent-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
          autoComplete="email"
          required
          disabled={loading}
        />
        {emailTouched && emailError ? (
          <p className="text-xs text-red-600">{emailError}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="agent-password" className="text-sm font-medium">
          Password
        </label>
        <div className="relative">
          <Input
            id="agent-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={loading}
            className="pr-12"
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
            disabled={loading}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="text-right">
        <Link href="/forgot-password" className="text-sm font-medium text-[#001F3F] hover:underline">
          Forgot password?
        </Link>
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