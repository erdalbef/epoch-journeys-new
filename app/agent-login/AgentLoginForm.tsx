"use client";

import { useState } from "react";

export default function RequestPartnershipForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [partnerType, setPartnerType] = useState("TRAVEL_AGENCY");

  const websiteRequired =
    partnerType === "TOUR_OPERATOR" ||
    partnerType === "TRAVEL_AGENCY";

  const agencyRequired =
    partnerType === "TOUR_OPERATOR" ||
    partnerType === "TRAVEL_AGENCY";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/agents/request", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData.entries())),
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded">
        <h3 className="text-lg font-semibold mb-2">
          Request Submitted Successfully
        </h3>
        <p>
          Your partnership request has been received. Our team will review your
          application and contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">

      <input type="text" name="companyName" style={{ display: "none" }} />

      <div>
        <label className="block font-medium">Partner Type *</label>
        <select
          name="partnerType"
          value={partnerType}
          onChange={(e) => setPartnerType(e.target.value)}
          required
          className="w-full border p-2 rounded"
        >
          <option value="TOUR_OPERATOR">Tour Operator</option>
          <option value="TRAVEL_AGENCY">Travel Agency</option>
          <option value="TRAVEL_EXPERT">Travel Expert</option>
          <option value="GROUP_LEADER">Group Leader</option>
        </select>
      </div>

      <div>
        <label className="block font-medium">Full Name *</label>
        <input name="fullName" required className="w-full border p-2 rounded" />
      </div>

      {agencyRequired && (
        <div>
          <label className="block font-medium">Travel Agency *</label>
          <input name="travelAgency" required className="w-full border p-2 rounded" />
        </div>
      )}

      <div>
        <label className="block font-medium">Phone *</label>
        <input name="phone" required className="w-full border p-2 rounded" />
      </div>

      <div>
        <label className="block font-medium">Website {websiteRequired && "*"}</label>
        <input
          name="website"
          type="url"
          required={websiteRequired}
          className="w-full border p-2 rounded"
        />
      </div>

      <div>
        <label className="block font-medium">Membership *</label>
        <select name="membership" required className="w-full border p-2 rounded">
          <option value="">Select</option>
          <option value="ASTA">ASTA</option>
          <option value="NTA">NTA</option>
          <option value="IATA">IATA</option>
          <option value="CLIA">CLIA</option>
          <option value="None">None</option>
        </select>
      </div>

      <div>
        <label className="block font-medium">Email *</label>
        <input name="email" type="email" required className="w-full border p-2 rounded" />
      </div>

      <div>
        <label className="block font-medium">Password *</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full border p-2 rounded"
        />
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="bg-red-800 text-white px-6 py-2 rounded"
      >
        {loading ? "Submitting..." : "Submit Request"}
      </button>
    </form>
  );
}