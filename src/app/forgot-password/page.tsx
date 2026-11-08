"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      setSubmitted(true);
      setBusy(false);
    }
  }
  return <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
    <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-[#001F3F]">Forgot password?</h1>
      {submitted ? <p role="status" className="mt-5 text-slate-700">If an account matches this email, password reset instructions will be sent.</p> :
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label htmlFor="reset-email" className="block font-medium">Account email address</label>
          <input id="reset-email" type="email" autoComplete="email" required maxLength={254}
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3" />
          <button disabled={busy} type="submit" className="w-full rounded-lg bg-[#001F3F] p-3 font-semibold text-white disabled:opacity-50">
            {busy ? "Submitting..." : "Send reset link"}
          </button>
        </form>}
      <Link href="/agent-login" className="mt-6 inline-block text-sm underline">Return to Agent Login</Link>
      <span className="mx-2 text-slate-400">·</span>
      <Link href="/admin-login" className="text-sm underline">Admin Login</Link>
    </section>
  </main>;
}
