"use client";

import { useMemo, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";

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

  const [emailTouched, setEmailTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailNormalized = useMemo(
    () => email.trim().toLowerCase(),
    [email]
  );

  const emailError = useMemo(() => {
    if (!emailTouched) return null;

    if (!emailNormalized) {
      return "Email address is required.";
    }

    if (!isValidEmail(emailNormalized)) {
      return "Please enter a valid email address.";
    }

    return null;
  }, [emailNormalized, emailTouched]);

  function handleEmailChange(value: string) {
    setEmail(value);

    if (error) {
      setError(null);
    }
  }

  function handlePasswordChange(value: string) {
    setPassword(value);

    if (error) {
      setError(null);
    }
  }

  async function onSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setEmailTouched(true);
    setError(null);

    if (!emailNormalized) {
      setError("Email address is required.");
      return;
    }

    if (!isValidEmail(emailNormalized)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: emailNormalized,
        password,
        redirect: false,
        callbackUrl: "/staff",
      });

      if (!result || result.error || result.ok === false) {
        setError("Invalid staff credentials.");
        return;
      }

      const sessionResponse = await fetch("/api/auth/session", {
        cache: "no-store",
      });

      if (!sessionResponse.ok) {
        setError(
          "We could not verify your Workspace access. Please try again."
        );
        return;
      }

      const sessionData = await sessionResponse.json();
      const role = sessionData?.user?.role;

      if (role !== "STAFF" && role !== "ADMIN") {
        await signOut({
          redirect: false,
        });

        setError(
          "This account does not have access to the Epoch Workspace."
        );

        return;
      }

      router.replace("/staff");
      router.refresh();
    } catch (loginError) {
      console.error("Epoch Workspace login error:", loginError);

      setError(
        "The Workspace could not be reached. Please try again."
      );
    } finally {
      setLoading(false);
    }
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

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <label
              htmlFor="staff-email"
              className="text-sm font-medium text-slate-800"
            >
              Email Address
            </label>

            <Input
              id="staff-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) =>
                handleEmailChange(event.target.value)
              }
              onBlur={() => setEmailTouched(true)}
              autoComplete="email"
              placeholder="name@epochjourneys.com"
              disabled={loading}
              aria-invalid={Boolean(emailError)}
              aria-describedby={
                emailError ? "staff-email-error" : undefined
              }
              className="h-12"
            />

            {emailError ? (
              <p
                id="staff-email-error"
                className="text-xs text-red-600"
              >
                {emailError}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="staff-password"
              className="text-sm font-medium text-slate-800"
            >
              Password
            </label>

            <div className="relative">
              <Input
                id="staff-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) =>
                  handlePasswordChange(event.target.value)
                }
                autoComplete="current-password"
                disabled={loading}
                className="h-12 pr-12"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                disabled={loading}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-[#0B1F3A] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}

          <Button
            type="submit"
            className="h-12 w-full bg-[#C9A24D] font-semibold text-[#0B1F3A] hover:bg-[#B8903E]"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle
                  size={17}
                  className="mr-2 animate-spin"
                />
                Opening Workspace...
              </>
            ) : (
              <>
                <LockKeyhole size={17} className="mr-2" />
                Continue Your Journey
              </>
            )}
          </Button>
        </form>

        <p className="mt-7 text-center text-xs leading-5 text-slate-400">
          Access is reserved for authorized Epoch Team Members.
        </p>
      </div>
    </main>
  );
}