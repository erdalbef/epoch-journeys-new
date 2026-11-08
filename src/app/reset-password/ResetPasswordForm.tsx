"use client";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 12 || password.length > 128) {setError("Password must be 12–128 characters.");return;}
    setBusy(true);
    try {
      const r = await fetch("/api/auth/reset-password", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({token,password}) });
      if (!r.ok) { setError("Reset link is invalid, expired, or cannot be used. Request a new link."); return; }
      setDone(true);setPassword("");setConfirm("");
    } catch { setError("Unable to complete password reset. Please try again."); }
    finally {setBusy(false);}
  }
  return <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
    <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-[#001F3F]">Create a new password</h1>
      {done ? <div role="status" className="mt-6">Your password was updated. <Link className="underline" href="/agent-login">Sign in</Link></div> :
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label htmlFor="reset-new" className="block font-medium">New password</label>
        <input id="reset-new" type={show?"text":"password"} autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border p-3" />
        <label htmlFor="reset-confirm" className="block font-medium">Confirm password</label>
        <input id="reset-confirm" type={show?"text":"password"} autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full rounded-lg border p-3" />
        <label className="flex gap-2 items-center"><input type="checkbox" checked={show} onChange={e=>setShow(e.target.checked)} /> Show passwords</label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button type="submit" disabled={busy || !/^[a-f0-9]{64}$/.test(token)} className="w-full rounded-lg bg-[#001F3F] p-3 text-white disabled:opacity-50">{busy?"Updating...":"Reset password"}</button>
        {!token && <p role="alert" className="text-red-700">Missing reset token. Request a new link.</p>}
      </form>}
    </section>
  </main>;
}
