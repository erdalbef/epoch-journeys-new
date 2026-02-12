"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PartnerType = "TRAVEL_AGENT" | "GROUP_LEADER";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim().toLowerCase());
}

export function RequestPartnershipForm() {
  const [isPending, startTransition] = useTransition();

  const [partnerType, setPartnerType] = useState<PartnerType | "">("");
  const [fullName, setFullName] = useState("");
  const [travelAgency, setTravelAgency] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [membership, setMembership] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean>(false);

  const emailNormalized = useMemo(() => email.trim().toLowerCase(), [email]);

  function validate(): string | null {
    if (!partnerType) return "Please select Partner Type.";

    if (!fullName.trim()) return "Full name is required.";
    if (!travelAgency.trim()) return "Travel Agency is required.";

    if (!emailNormalized) return "Email is required.";
    if (!isValidEmail(emailNormalized)) return "Please enter a valid email address.";

    if (!password) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";

    // membership optional (keep flexible) — if you want required, say so.
    return null;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(false);

    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/agents/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerType,
          fullName: fullName.trim(),
          travelAgency: travelAgency.trim(),
          phone: phone.trim() || null,
          website: website.trim() || null,
          membership: membership.trim() || null,
          email: emailNormalized,
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ? String(data.error) : `Request failed (HTTP ${res.status}).`);
        return;
      }

      setOk(true);
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {/* Partner Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Partner Type</label>
        <select
          value={partnerType}
          onChange={(e) => setPartnerType(e.target.value as PartnerType | "")}
          className="h-10 w-full rounded-md border bg-white px-3 text-sm"
          disabled={isPending}
        >
          <option value="">Select...</option>
          <option value="TRAVEL_AGENT">Travel Advisor / Expert</option>
          <option value="GROUP_LEADER">Group Leader</option>
        </select>
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Full Name</label>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={isPending}
          placeholder="Your full name"
        />
      </div>

      {/* Travel Agency */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Travel Agency</label>
        <Input
          value={travelAgency}
          onChange={(e) => setTravelAgency(e.target.value)}
          disabled={isPending}
          placeholder="Your travel agency name"
        />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Phone (optional)</label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isPending}
          placeholder="+1 ..."
        />
      </div>

      {/* Website */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Website (optional)</label>
        <Input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          disabled={isPending}
          placeholder="https://..."
        />
      </div>

      {/* Membership */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Membership (optional) <span className="text-xs text-muted-foreground">(ASTA / NTA / IATA / CLIA)</span>
        </label>
        <Input
          value={membership}
          onChange={(e) => setMembership(e.target.value)}
          disabled={isPending}
          placeholder="e.g., ASTA"
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          placeholder="name@domain.com"
        />
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Password</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
        />
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Request submitted. Your account is pending approval.
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Submitting..." : "Submit Request"}
      </Button>
    </form>
  );
}
