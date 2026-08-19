"use client";

import {
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

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

  billingCompanyName: string;
  billingCompanyRegNo: string;
  billingTaxNumber: string;
  billingVatNumber: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  billingCountry: string;
  billingContactName: string;
  billingEmail: string;
  billingEmailSecondary: string;
  billingPhone: string;
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

  billingCompanyName: "",
  billingCompanyRegNo: "",
  billingTaxNumber: "",
  billingVatNumber: "",
  billingAddress: "",
  billingCity: "",
  billingState: "",
  billingPostalCode: "",
  billingCountry: "",
  billingContactName: "",
  billingEmail: "",
  billingEmailSecondary: "",
  billingPhone: "",
};

export default function RequestPartnershipPage() {
  const [form, setForm] =
    useState<FormState>(initialForm);

  const [
    useContactEmailForBilling,
    setUseContactEmailForBilling,
  ] = useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  function updateField<
    K extends keyof FormState,
  >(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handlePrimaryEmailChange(
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      email: value,
      billingEmail:
        useContactEmailForBilling
          ? value
          : current.billingEmail,
    }));
  }

  function toggleBillingEmail(
    checked: boolean,
  ) {
    setUseContactEmailForBilling(
      checked,
    );

    if (checked) {
      setForm((current) => ({
        ...current,
        billingEmail:
          current.email,
      }));
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
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

    if (
      form.password.length < 6
    ) {
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
      !form.billingCompanyName.trim()
    ) {
      setErrorMessage(
        "Legal company / organization name is required. Group leaders may enter their own legal name.",
      );
      return;
    }

    if (
      !form.billingAddress.trim() ||
      !form.billingCity.trim() ||
      !form.billingPostalCode.trim() ||
      !form.billingCountry.trim()
    ) {
      setErrorMessage(
        "Please complete the required billing address fields.",
      );
      return;
    }

    if (!form.billingEmail.trim()) {
      setErrorMessage(
        "Primary billing email is required.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        await fetch(
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

              billingCompanyName:
                form.billingCompanyName.trim(),
              billingCompanyRegNo:
                form.billingCompanyRegNo.trim() ||
                null,
              billingTaxNumber:
                form.billingTaxNumber.trim() ||
                null,
              billingVatNumber:
                form.billingVatNumber.trim() ||
                null,

              billingAddress:
                form.billingAddress.trim(),
              billingCity:
                form.billingCity.trim(),
              billingState:
                form.billingState.trim() ||
                null,
              billingPostalCode:
                form.billingPostalCode.trim(),
              billingCountry:
                form.billingCountry.trim(),

              billingContactName:
                form.billingContactName.trim() ||
                form.fullName.trim(),
              billingEmail:
                form.billingEmail
                  .trim()
                  .toLowerCase(),
              billingEmailSecondary:
                form.billingEmailSecondary.trim()
                  ? form.billingEmailSecondary
                      .trim()
                      .toLowerCase()
                  : null,
              billingPhone:
                form.billingPhone.trim() ||
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

      setUseContactEmailForBilling(
        true,
      );
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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
        <section className="overflow-hidden rounded-3xl bg-[#001F3F] px-6 py-8 text-white shadow-sm sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-200">
            Epoch Journeys Partner Network
          </p>

          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Become a Partner
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            Apply to work with Epoch
            Journeys as a travel agency,
            tour operator, travel expert,
            or group leader. Approved
            partners receive access to our
            B2B workspace, tours, resources,
            quotations, and booking tools.
          </p>
        </section>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6"
        >
          {successMessage ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
              {successMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
              {errorMessage}
            </div>
          ) : null}

          <FormSection
            eyebrow="Step 1"
            title="Contact & Login"
            description="Tell us who you are and create the login you will use after approval."
          >
            <div className="grid gap-5 md:grid-cols-2">
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
                  required
                />
              </Field>

              <Field label="Email *">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    handlePrimaryEmailChange(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="name@company.com"
                  required
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
                  placeholder="+1 555 555 5555"
                />
              </Field>

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
                  required
                >
                  <option value="TRAVEL_AGENCY">
                    Travel Agency
                  </option>

                  <option value="TOUR_OPERATOR">
                    Tour Operator
                  </option>

                  <option value="TRAVEL_EXPERT">
                    Travel Expert
                  </option>

                  <option value="GROUP_LEADER">
                    Group Leader
                  </option>
                </select>
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
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
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
                  placeholder="Repeat password"
                  minLength={6}
                  required
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            eyebrow="Step 2"
            title="Business Profile"
            description="These details help Epoch Journeys understand your organization and partner profile."
          >
            <div className="grid gap-5 md:grid-cols-2">
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
                  placeholder="Agency or organization name"
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
                  placeholder="https://..."
                />
              </Field>

              <Field label="Membership">
                <input
                  type="text"
                  value={
                    form.membership
                  }
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
          </FormSection>

          <FormSection
            eyebrow="Step 3"
            title="Billing & Invoice Details"
            description="These details will be used to prepare quotations, proformas, invoices, and other commercial documents. Please enter the legal billing information carefully."
          >
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
              Group leaders or individual
              partners who do not operate
              through a registered company
              may enter their own legal name
              as the Legal Company /
              Organization Name. Company
              registration, Tax ID, and VAT
              fields can be left blank where
              they do not apply.
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field label="Legal Company / Organization Name *">
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
                  placeholder="Exact legal billing name"
                  required
                />
              </Field>

              <Field label="Company Registration Number">
                <input
                  type="text"
                  value={
                    form.billingCompanyRegNo
                  }
                  onChange={(event) =>
                    updateField(
                      "billingCompanyRegNo",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Registration / company number"
                />
              </Field>

              <Field label="Tax Number / Tax ID">
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
                  placeholder="Tax identification number"
                />
              </Field>

              <Field label="VAT Number">
                <input
                  type="text"
                  value={
                    form.billingVatNumber
                  }
                  onChange={(event) =>
                    updateField(
                      "billingVatNumber",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="VAT number, if applicable"
                />
              </Field>

              <Field label="Billing Address *">
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
                  placeholder="Street and number"
                  required
                />
              </Field>

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
                  required
                />
              </Field>

              <Field label="State / Province">
                <input
                  type="text"
                  value={
                    form.billingState
                  }
                  onChange={(event) =>
                    updateField(
                      "billingState",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Postal / ZIP Code *">
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
                  required
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
                  required
                />
              </Field>

              <Field label="Invoice Contact Person">
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
                  placeholder={
                    form.fullName ||
                    "Billing contact"
                  }
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
                  disabled={
                    useContactEmailForBilling
                  }
                  required
                />

                <label className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={
                      useContactEmailForBilling
                    }
                    onChange={(event) =>
                      toggleBillingEmail(
                        event.target
                          .checked,
                      )
                    }
                  />

                  Use my contact email
                  as the primary billing
                  email
                </label>
              </Field>

              <Field label="Secondary Billing Email / CC">
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
                  placeholder="Optional accounting / CC email"
                />
              </Field>

              <Field label="Invoice Phone">
                <input
                  type="tel"
                  value={
                    form.billingPhone
                  }
                  onChange={(event) =>
                    updateField(
                      "billingPhone",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Billing contact phone"
                />
              </Field>
            </div>
          </FormSection>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#001F3F]">
                  Submit Application
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Your account remains
                  pending until it is
                  reviewed and approved by
                  Epoch Journeys.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Submitting..."
                  : "Submit Partnership Request"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}

function FormSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-bold text-[#001F3F]">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="mt-1.5">
        {children}
      </div>
    </div>
  );
}

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#8B0000] focus:ring-4 focus:ring-red-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
