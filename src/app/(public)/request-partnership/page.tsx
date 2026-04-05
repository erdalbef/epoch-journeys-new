"use client";

import { useState } from "react";

type FormState = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  travelAgency: string;
  phone: string;
  website: string;
  membership: string;
  partnerType: "TRAVEL_AGENCY" | "GROUP_LEADER" | "TOUR_OPERATOR" | "TRAVEL_EXPERT";
};

export default function RequestPartnershipPage() {
  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    travelAgency: "",
    phone: "",
    website: "",
    membership: "",
    partnerType: "TRAVEL_AGENCY",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function updateField<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (!form.fullName.trim()) {
      setErrorMessage("Full name is required.");
      return;
    }

    if (!form.email.trim()) {
      setErrorMessage("Email is required.");
      return;
    }

    if (!form.password) {
      setErrorMessage("Password is required.");
      return;
    }

    if (form.password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/request-partnership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          travelAgency: form.travelAgency.trim() || null,
          phone: form.phone.trim() || null,
          website: form.website.trim() || null,
          membership: form.membership.trim() || null,
          partnerType: form.partnerType,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setErrorMessage(data?.error || "Failed to submit request.");
        return;
      }

      setSuccessMessage(
        "Your partnership request has been submitted successfully. Our team will review it and contact you after approval."
      );

      setForm({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
        travelAgency: "",
        phone: "",
        website: "",
        membership: "",
        partnerType: "TRAVEL_AGENCY",
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <section className="rounded-2xl border bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-[#001F3F]">
            Request Partnership
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Apply to work with Epoch Journeys as a travel agency, tour operator,
            travel expert, or group leader. Once approved, you will gain access
            to the B2B portal and booking tools.
          </p>
        </section>

        <section className="mt-8 rounded-2xl border bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Partnership Application
          </h2>

          {successMessage && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Full Name *">
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
                  placeholder="Enter full name"
                />
              </Field>

              <Field label="Email *">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
                  placeholder="Enter email"
                />
              </Field>

              <Field label="Password *">
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
                  placeholder="Create password"
                />
              </Field>

              <Field label="Confirm Password *">
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
                  placeholder="Confirm password"
                />
              </Field>

              <Field label="Partner Type *">
                <select
                  value={form.partnerType}
                  onChange={(e) =>
                    updateField(
                      "partnerType",
                      e.target.value as FormState["partnerType"]
                    )
                  }
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
                >
                  <option value="TRAVEL_AGENCY">Travel Agency</option>
                  <option value="GROUP_LEADER">Group Leader</option>
                  <option value="TOUR_OPERATOR">Tour Operator</option>
                  <option value="TRAVEL_EXPERT">Travel Expert</option>
                </select>
              </Field>

              <Field label="Travel Agency / Organization">
                <input
                  type="text"
                  value={form.travelAgency}
                  onChange={(e) => updateField("travelAgency", e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
                  placeholder="Enter agency or organization"
                />
              </Field>

              <Field label="Phone">
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
                  placeholder="Enter phone number"
                />
              </Field>

              <Field label="Website">
                <input
                  type="text"
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
                  placeholder="Enter website"
                />
              </Field>

              <Field label="Membership">
                <input
                  type="text"
                  value={form.membership}
                  onChange={(e) => updateField("membership", e.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
                  placeholder="ASTA, NTA, IATA, CLIA, etc."
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#6f0000] disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[#001F3F]">
        {label}
      </label>
      {children}
    </div>
  );
}