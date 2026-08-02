"use client";

import { useMemo, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
    email.trim().toLowerCase()
  );
}

export function StaffLoginForm() {
  const router = useRouter();

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
      callbackUrl: "/staff",
    });

    if (!res || res.error || res.ok === false) {
      setLoading(false);
      setError("Invalid staff credentials.");
      return;
    }

    const sessionResponse = await fetch("/api/auth/session", {
      cache: "no-store",
    });

    const sessionData = await sessionResponse.json();

    const role = sessionData?.user?.role;

    if (role !== "STAFF" && role !== "ADMIN") {
      await signOut({
        redirect: false,
      });

      setLoading(false);
      setError("This account does not have access to the Epoch Workspace.");
      return;
    }

    router.push("/staff");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07172D] px-6 py-16">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#C9A24D]/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl sm:p-10">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
            Epoch Journeys
          </p>

          <h1 className="mt-4 font-serif text-3xl text-[#0B1F3A]">
            Enter Epoch Workspace
          </h1>

          <p className="mt-4 font-serif text-lg italic text-[#8B6B23]">
            Per Fidem, Per Excellentiam
          </p>

          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Through Faith, Through Excellence
          </p>

          <div className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full bg-[#F7F3EA] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#0B1F3A]">
            <LockKeyhole size={15} />
            Authorized Team Members Only
          </div>

          <p className="mt-6 text-sm leading-6 text-slate-600">
            Sign in using your private Epoch staff account.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="staff-email"
              className="text-sm font-medium text-slate-800"
            >
              Email
            </label>

            <Input
              id="staff-email"
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
            <label
              htmlFor="staff-password"
              className="text-sm font-medium text-slate-800"
            >
              Password
            </label>

            <Input
              id="staff-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            className="w-full bg-[#C9A24D] text-[#0B1F3A] hover:bg-[#B8903E]"
            disabled={loading}
          >
            {loading ? "Entering Workspace..." : "Enter Epoch Workspace"}
          </Button>
        </form>

        <p className="mt-7 text-center text-xs leading-5 text-slate-400">
          Access is reserved for authorized Epoch Team Members.
        </p>
      </div>
    </main>
  );
}