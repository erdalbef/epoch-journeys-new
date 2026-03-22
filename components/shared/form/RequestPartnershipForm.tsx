"use client";

import { useState } from "react";
import { PhoneInput } from "./phoneInput";

export default function RequestPartnershipForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [phoneCode, setPhoneCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setSuccess(false);
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    // attach phone values
    formData.set("countryCode", phoneCode);
    formData.set("phone", phoneNumber);

    try {
      const res = await fetch("/api/request-partnership", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);
      form.reset();
      setPhoneCode("+1");
      setPhoneNumber("");
    } catch {
      setError("Unable to submit your request right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
      <h2 className="text-xl font-semibold text-[#001F3F]">
        Partnership Request Form
      </h2>

      <p className="mt-3 text-sm leading-7 text-gray-600">
        Please complete the form below and our team will review your request.
      </p>

      {success && (
        <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Your request has been submitted successfully.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* NAME */}
        <input
          name="name"
          required
          placeholder="Full Name"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
        />

        {/* EMAIL */}
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
        />

        {/* PHONE */}
        <PhoneInput
          label="Phone"
          codeValue={phoneCode}
          numberValue={phoneNumber}
          onCodeChange={setPhoneCode}
          onNumberChange={setPhoneNumber}
          codeName="countryCode"
          numberName="phone"
          placeholder="555 123 4567"
        />

        {/* AGENCY */}
        <input
          name="agency"
          required
          placeholder="Travel Agency Name"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
        />

        {/* COUNTRY */}
        <input
          name="country"
          required
          placeholder="Country"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
        />

        {/* WEBSITE */}
        <input
          name="website"
          placeholder="Website (optional)"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
        />

        {/* PARTNER TYPE */}
        <select
          name="partnerType"
          required
          defaultValue=""
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
        >
          <option value="" disabled>
            Select Partner Type
          </option>
          <option value="Travel Agency">Travel Agency</option>
          <option value="Tour Operator">Tour Operator</option>
          <option value="Travel Advisor / Expert">
            Travel Advisor / Expert
          </option>
          <option value="Group Leader">Group Leader</option>
        </select>

        {/* MEMBERSHIP */}
        <div>
          <input
            name="membership"
            placeholder="Membership (e.g. ASTA, NTA, IATA, CLIA)"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
          />
          <p className="mt-2 text-xs text-gray-500">
            Please enter at least one professional membership if applicable.
          </p>
        </div>

        {/* MESSAGE */}
        <textarea
          name="message"
          placeholder="Short message"
          rows={5}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
        />

        {/* BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#8B0000] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}