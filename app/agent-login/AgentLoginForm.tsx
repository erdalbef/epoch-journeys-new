"use client";

import { useState } from "react";

type PartnerType =
  | "TOUR_OPERATOR"
  | "TRAVEL_AGENCY"
  | "TRAVEL_EXPERT"
  | "GROUP_LEADER";

export default function RequestPartnershipForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [partnerType, setPartnerType] = useState<PartnerType>("TRAVEL_AGENCY");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const websiteRequired =
    partnerType === "TOUR_OPERATOR" || partnerType === "TRAVEL_AGENCY";

  const agencyRequired =
    partnerType === "TOUR_OPERATOR" || partnerType === "TRAVEL_AGENCY";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      partnerType,
      fullName: String(formData.get("fullName") || "").trim(),
      travelAgency: String(formData.get("travelAgency") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      website: String(formData.get("website") || "").trim(),
      membership: String(formData.get("membership") || "").trim(),
      email: String(formData.get("email") || "")
        .trim()
        .toLowerCase(),
      password: String(formData.get("password") || ""),
      companyName: String(formData.get("companyName") || "").trim(), // honeypot
    };

    const res = await fetch("/api/agents/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error || "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    form.reset();
    setPassword("");
    setConfirmPassword("");
    setPartnerType("TRAVEL_AGENCY");
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6">
        <h3 className="text-xl font-semibold text-green-800">
          Request Submitted Successfully
        </h3>
        <p className="mt-2 text-sm text-green-700">
          Your partnership request has been received. Our team will review your
          application before approving access to the B2B platform.
        </p>
        <p className="mt-2 text-sm text-green-700">
          You will be contacted once your request has been reviewed.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl rounded-2xl border bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#001F3F]">Request Partnership</h2>
        <p className="mt-2 text-sm text-gray-600">
          Apply for access to our B2B platform for Travel Agencies, Travel
          Advisors / Experts, Tour Operators, and Group Leaders.
        </p>
        <p className="mt-1 text-sm text-gray-600">
          All requests are reviewed by our team before access is approved.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <input type="text" name="companyName" autoComplete="off" className="hidden" />

        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-black">
              Partner Type <span className="text-red-700">*</span>
            </label>
            <select
              name="partnerType"
              value={partnerType}
              onChange={(e) => setPartnerType(e.target.value as PartnerType)}
              required
              className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20"
            >
              <option value="TOUR_OPERATOR">Tour Operator</option>
              <option value="TRAVEL_AGENCY">Travel Agency</option>
              <option value="TRAVEL_EXPERT">Travel Advisor / Expert</option>
              <option value="GROUP_LEADER">Group Leader</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Full Name <span className="text-red-700">*</span>
            </label>
            <input
              name="fullName"
              required
              className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Phone <span className="text-red-700">*</span>
            </label>
            <input
              name="phone"
              required
              className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Travel Agency {agencyRequired ? <span className="text-red-700">*</span> : null}
            </label>
            <input
              name="travelAgency"
              required={agencyRequired}
              className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Website {websiteRequired ? <span className="text-red-700">*</span> : null}
            </label>
            <input
              name="website"
              type="url"
              required={websiteRequired}
              placeholder="https://"
              className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Membership <span className="text-red-700">*</span>
            </label>
            <select
              name="membership"
              required
              className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20"
            >
              <option value="">Select</option>
              <option value="ASTA">ASTA</option>
              <option value="NTA">NTA</option>
              <option value="IATA">IATA</option>
              <option value="CLIA">CLIA</option>
              <option value="None">None</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              One membership entry is sufficient.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Email <span className="text-red-700">*</span>
            </label>
            <input
              name="email"
              type="email"
              required
              className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Password <span className="text-red-700">*</span>
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Confirm Password <span className="text-red-700">*</span>
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20"
            />
          </div>
        </div>

        <div className="rounded-lg bg-[#F8FAFC] p-4 text-sm text-gray-700">
          Access to the B2B platform is granted only after application review and
          approval by our team.
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 items-center justify-center rounded-md bg-[#8B0000] px-6 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}