"use client";

import { useState } from "react";

type PartnerType =
  | "TRAVEL_AGENCY"
  | "GROUP_LEADER"
  | "TOUR_OPERATOR"
  | "TRAVEL_EXPERT";

type FormState = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;

  travelAgency: string;
  phone: string;
  website: string;
  membership: string;
  partnerType: PartnerType;

  billingContactName: string;
  billingCompanyName: string;
  billingEmail: string;
  billingEmailSecondary: string;
  billingAddress: string;
  billingCity: string;
  billingPostalCode: string;
  billingCountry: string;
  billingTaxNumber: string;
};

const initialForm: FormState = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",

  travelAgency: "",
  phone: "",
  website: "",
  membership: "",
  partnerType: "TRAVEL_AGENCY",

  billingContactName: "",
  billingCompanyName: "",
  billingEmail: "",
  billingEmailSecondary: "",
  billingAddress: "",
  billingCity: "",
  billingPostalCode: "",
  billingCountry: "",
  billingTaxNumber: "",
};

export default function RequestPartnershipPage() {
  const [form, setForm] =
    useState<FormState>(initialForm);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  function updateField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function copyContactToBilling() {
    setForm((previous) => ({
      ...previous,

      billingContactName:
        previous.billingContactName ||
        previous.fullName,

      billingCompanyName:
        previous.billingCompanyName ||
        previous.travelAgency,

      billingEmail:
        previous.billingEmail ||
        previous.email,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (!form.fullName.trim()) {
      setErrorMessage(
        "Full name is required.",
      );
      return;
    }

    if (!form.email.trim()) {
      setErrorMessage(
        "Email is required.",
      );
      return;
    }

    if (!form.password) {
      setErrorMessage(
        "Password is required.",
      );
      return;
    }

    if (form.password.length < 6) {
      setErrorMessage(
        "Password must be at least 6 characters.",
      );
      return;
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      setErrorMessage(
        "Passwords do not match.",
      );
      return;
    }

    if (
      !form.billingContactName.trim()
    ) {
      setErrorMessage(
        "Billing contact name is required.",
      );
      return;
    }

    if (
      !form.billingCompanyName.trim()
    ) {
      setErrorMessage(
        "Legal billing name / company / organization is required.",
      );
      return;
    }

    if (!form.billingEmail.trim()) {
      setErrorMessage(
        "Primary billing email is required.",
      );
      return;
    }

    if (!form.billingAddress.trim()) {
      setErrorMessage(
        "Billing address is required.",
      );
      return;
    }

    if (!form.billingCity.trim()) {
      setErrorMessage(
        "Billing city is required.",
      );
      return;
    }

    if (!form.billingCountry.trim()) {
      setErrorMessage(
        "Billing country is required.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/request-partnership",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            fullName:
              form.fullName.trim(),

            email:
              form.email
                .trim()
                .toLowerCase(),

            password:
              form.password,

            travelAgency:
              form.travelAgency.trim() ||
              null,

            phone:
              form.phone.trim() ||
              null,

            website:
              form.website.trim() ||
              null,

            membership:
              form.membership.trim() ||
              null,

            partnerType:
              form.partnerType,

            /*
             * Billing / Invoice Information
             */
            billingContactName:
              form.billingContactName.trim(),

            billingCompanyName:
              form.billingCompanyName.trim(),

            billingEmail:
              form.billingEmail
                .trim()
                .toLowerCase(),

            billingEmailSecondary:
              form.billingEmailSecondary
                .trim()
                .toLowerCase() ||
              null,

            billingAddress:
              form.billingAddress.trim(),

            billingCity:
              form.billingCity.trim(),

            billingPostalCode:
              form.billingPostalCode.trim() ||
              null,

            billingCountry:
              form.billingCountry.trim(),

            /*
             * Optional.
             *
             * Some international partners may
             * not have an applicable Tax /
             * Company Registration Number.
             */
            billingTaxNumber:
              form.billingTaxNumber.trim() ||
              null,
          }),
        },
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        setErrorMessage(
          data?.error ||
            "Failed to submit request.",
        );
        return;
      }

      setSuccessMessage(
        "Your partnership request has been submitted successfully. Our team will review it and contact you after approval.",
      );

      setForm(initialForm);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Header */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8B0000]">
            Epoch Journeys
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#001F3F]">
            Request Partnership
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Apply to work with Epoch Journeys as a
            travel agency, tour operator, travel
            expert, or group leader. Once approved,
            you will gain access to the B2B portal
            and booking tools.
          </p>
        </div>

        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Partnership Application
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Fields marked with * are required.
          </p>

          {successMessage ? (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <form
            onSubmit={handleSubmit}
            className="mt-7 space-y-8"
          >
            {/* ==================================== */}
            {/* ACCOUNT INFORMATION */}
            {/* ==================================== */}

            <div>
              <SectionHeading
                title="Account Information"
                description="Primary contact and secure access information."
              />

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field label="Full Name *">
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(event) =>
                      updateField(
                        "fullName",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Enter full name"
                    autoComplete="name"
                  />
                </Field>

                <Field label="Email *">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField(
                        "email",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Enter email"
                    autoComplete="email"
                  />
                </Field>

                <Field label="Password *">
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      updateField(
                        "password",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Create password"
                    autoComplete="new-password"
                  />
                </Field>

                <Field label="Confirm Password *">
                  <input
                    type="password"
                    value={
                      form.confirmPassword
                    }
                    onChange={(event) =>
                      updateField(
                        "confirmPassword",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                  />
                </Field>
              </div>
            </div>

            {/* ==================================== */}
            {/* PARTNERSHIP INFORMATION */}
            {/* ==================================== */}

            <div className="border-t pt-7">
              <SectionHeading
                title="Partnership Information"
                description="Tell us about your business or organization."
              />

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field label="Partner Type *">
                  <select
                    value={form.partnerType}
                    onChange={(event) =>
                      updateField(
                        "partnerType",
                        event.target
                          .value as PartnerType,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="TRAVEL_AGENCY">
                      Travel Agency
                    </option>

                    <option value="GROUP_LEADER">
                      Group Leader
                    </option>

                    <option value="TOUR_OPERATOR">
                      Tour Operator
                    </option>

                    <option value="TRAVEL_EXPERT">
                      Travel Expert
                    </option>
                  </select>
                </Field>

                <Field label="Travel Agency / Organization">
                  <input
                    type="text"
                    value={
                      form.travelAgency
                    }
                    onChange={(event) =>
                      updateField(
                        "travelAgency",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Enter agency or organization"
                  />
                </Field>

                <Field label="Phone">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateField(
                        "phone",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="+1 555 123 4567"
                    autoComplete="tel"
                  />
                </Field>

                <Field label="Website">
                  <input
                    type="text"
                    value={form.website}
                    onChange={(event) =>
                      updateField(
                        "website",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="https://example.com"
                  />
                </Field>

                <Field
                  label="Membership"
                  hint="Optional — ASTA, NTA, IATA, CLIA, or another professional association."
                >
                  <input
                    type="text"
                    value={form.membership}
                    onChange={(event) =>
                      updateField(
                        "membership",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="ASTA, NTA, IATA, CLIA, etc."
                  />
                </Field>
              </div>
            </div>

            {/* ==================================== */}
            {/* BILLING / INVOICE INFORMATION */}
            {/* ==================================== */}

            <div className="border-t pt-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <SectionHeading
                  title="Billing & Invoice Information"
                  description="These details will be used to prepare Proformas and Invoices for your bookings."
                />

                <button
                  type="button"
                  onClick={
                    copyContactToBilling
                  }
                  className="w-fit rounded-lg border border-[#001F3F]/20 bg-white px-3 py-2 text-xs font-semibold text-[#001F3F] transition hover:bg-slate-50"
                >
                  Copy Contact Details
                </button>
              </div>

              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs leading-5 text-blue-800">
                  Please provide the legal billing
                  details you would like Epoch
                  Journeys to use on your Proformas
                  and Invoices.
                </p>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field label="Billing Contact Name *">
                  <input
                    type="text"
                    value={
                      form.billingContactName
                    }
                    onChange={(event) =>
                      updateField(
                        "billingContactName",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Person responsible for billing"
                  />
                </Field>

                <Field label="Legal Billing Name / Company / Organization *">
                  <input
                    type="text"
                    value={
                      form.billingCompanyName
                    }
                    onChange={(event) =>
                      updateField(
                        "billingCompanyName",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Legal billing name"
                  />
                </Field>

                <Field label="Primary Billing Email *">
                  <input
                    type="email"
                    value={
                      form.billingEmail
                    }
                    onChange={(event) =>
                      updateField(
                        "billingEmail",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="accounting@example.com"
                  />
                </Field>

                <Field
                  label="Secondary Billing Email"
                  hint="Optional — invoices can also be copied to this address."
                >
                  <input
                    type="email"
                    value={
                      form.billingEmailSecondary
                    }
                    onChange={(event) =>
                      updateField(
                        "billingEmailSecondary",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="manager@example.com"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Registered / Billing Address *">
                    <input
                      type="text"
                      value={
                        form.billingAddress
                      }
                      onChange={(event) =>
                        updateField(
                          "billingAddress",
                          event.target.value,
                        )
                      }
                      className={inputClass}
                      placeholder="Street address"
                      autoComplete="street-address"
                    />
                  </Field>
                </div>

                <Field label="City *">
                  <input
                    type="text"
                    value={
                      form.billingCity
                    }
                    onChange={(event) =>
                      updateField(
                        "billingCity",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="City"
                    autoComplete="address-level2"
                  />
                </Field>

                <Field
                  label="Postal / ZIP Code"
                  hint="Optional where not applicable."
                >
                  <input
                    type="text"
                    value={
                      form.billingPostalCode
                    }
                    onChange={(event) =>
                      updateField(
                        "billingPostalCode",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Postal / ZIP code"
                    autoComplete="postal-code"
                  />
                </Field>

                <Field label="Country *">
                  <input
                    type="text"
                    value={
                      form.billingCountry
                    }
                    onChange={(event) =>
                      updateField(
                        "billingCountry",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Country"
                    autoComplete="country-name"
                  />
                </Field>

                <Field
                  label="Tax / Company Registration Number"
                  hint="Optional — leave blank if your business or organization does not have one."
                >
                  <input
                    type="text"
                    value={
                      form.billingTaxNumber
                    }
                    onChange={(event) =>
                      updateField(
                        "billingTaxNumber",
                        event.target.value,
                      )
                    }
                    className={inputClass}
                    placeholder="Tax ID / Company Registration No."
                  />
                </Field>
              </div>
            </div>

            {/* ==================================== */}
            {/* SUBMIT */}
            {/* ==================================== */}

            <div className="border-t pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Submitting..."
                  : "Submit Partnership Request"}
              </button>

              <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-500">
                Partnership access is subject to
                approval by Epoch Journeys.
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#8B0000] focus:ring-1 focus:ring-[#8B0000]/20";

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#001F3F]">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-800">
        {label}
      </span>

      {children}

      {hint ? (
        <span className="mt-1.5 block text-xs leading-5 text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}