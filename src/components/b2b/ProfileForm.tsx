"use client";

import { useState, useTransition } from "react";

type ProfileFormProps = {
  initialData: {
    fullName: string;
    email: string;
    phone: string;
    travelAgency: string;
    website: string;
    membership: string;
    agentLogoUrl: string;

    partnerType: string;
    agentCode: string;

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
};

type ApiResponse = {
  success?: boolean;
  error?: string;
};

type LogoUploadResponse = {
  success?: boolean;
  error?: string;
  logoUrl?: string;
};

export function ProfileForm({
  initialData,
}: ProfileFormProps) {
  const [isPending, startTransition] =
    useTransition();

  const [form, setForm] = useState({
    fullName: initialData.fullName,
    phone: initialData.phone,
    travelAgency: initialData.travelAgency,
    website: initialData.website,
    membership: initialData.membership,

    billingCompanyName:
      initialData.billingCompanyName,
    billingCompanyRegNo:
      initialData.billingCompanyRegNo,
    billingTaxNumber:
      initialData.billingTaxNumber,
    billingVatNumber:
      initialData.billingVatNumber,
    billingAddress:
      initialData.billingAddress,
    billingCity:
      initialData.billingCity,
    billingState:
      initialData.billingState,
    billingPostalCode:
      initialData.billingPostalCode,
    billingCountry:
      initialData.billingCountry,
    billingContactName:
      initialData.billingContactName,
    billingEmail:
      initialData.billingEmail,
    billingEmailSecondary:
      initialData.billingEmailSecondary,
    billingPhone:
      initialData.billingPhone,
  });

  const [agentLogoUrl, setAgentLogoUrl] =
    useState(initialData.agentLogoUrl);

  const [logoFile, setLogoFile] =
    useState<File | null>(null);

  const [
    uploadingLogo,
    setUploadingLogo,
  ] = useState(false);

  const [
    deletingLogo,
    setDeletingLogo,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    logoSuccessMessage,
    setLogoSuccessMessage,
  ] = useState("");

  const [
    logoErrorMessage,
    setLogoErrorMessage,
  ] = useState("");

  function updateField(
    key: keyof typeof form,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setSuccessMessage("");
    setErrorMessage("");
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (!form.billingCompanyName.trim()) {
      setErrorMessage(
        "Legal company / organization name is required.",
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

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/b2b/profile",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(form),
          },
        );

        let data: ApiResponse = {};

        try {
          data =
            (await response.json()) as ApiResponse;
        } catch {
          data = {
            error:
              "Server returned an unexpected response.",
          };
        }

        if (!response.ok) {
          setErrorMessage(
            data.error ||
              "Failed to update profile.",
          );
          return;
        }

        setSuccessMessage(
          "Profile updated successfully.",
        );
      } catch (error) {
        console.error(
          "PROFILE_UPDATE_CLIENT_ERROR",
          error,
        );

        setErrorMessage(
          "Something went wrong while saving your profile.",
        );
      }
    });
  }

  async function handleLogoUpload() {
    if (!logoFile) {
      setLogoErrorMessage(
        "Please choose a logo file first.",
      );
      return;
    }

    setLogoSuccessMessage("");
    setLogoErrorMessage("");
    setUploadingLogo(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "logo",
        logoFile,
      );

      const response =
        await fetch(
          "/api/b2b/profile/logo",
          {
            method: "POST",
            body: formData,
          },
        );

      const data =
        (await response.json()) as LogoUploadResponse;

      if (!response.ok) {
        setLogoErrorMessage(
          data.error ||
            "Failed to upload logo.",
        );
        return;
      }

      setAgentLogoUrl(
        data.logoUrl || "",
      );

      setLogoFile(null);

      setLogoSuccessMessage(
        "Logo uploaded successfully.",
      );
    } catch (error) {
      console.error(
        "PROFILE_LOGO_UPLOAD_CLIENT_ERROR",
        error,
      );

      setLogoErrorMessage(
        "Something went wrong while uploading your logo.",
      );
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogoDelete() {
    const confirmed =
      window.confirm(
        "Are you sure you want to remove your agency logo?",
      );

    if (!confirmed) {
      return;
    }

    setLogoSuccessMessage("");
    setLogoErrorMessage("");
    setDeletingLogo(true);

    try {
      const response =
        await fetch(
          "/api/b2b/profile/logo/delete",
          {
            method: "DELETE",
          },
        );

      let data: ApiResponse = {};

      try {
        data =
          (await response.json()) as ApiResponse;
      } catch {
        data = {
          error:
            "Server returned an unexpected response.",
        };
      }

      if (!response.ok) {
        setLogoErrorMessage(
          data.error ||
            "Failed to remove logo.",
        );
        return;
      }

      setAgentLogoUrl("");
      setLogoFile(null);

      setLogoSuccessMessage(
        "Logo removed successfully.",
      );
    } catch (error) {
      console.error(
        "PROFILE_LOGO_DELETE_CLIENT_ERROR",
        error,
      );

      setLogoErrorMessage(
        "Something went wrong while removing your logo.",
      );
    } finally {
      setDeletingLogo(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Partner Profile
          </p>

          <h2 className="mt-1 text-lg font-semibold text-[#001F3F]">
            Contact & Business Information
          </h2>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Full Name">
            <input
              value={form.fullName}
              onChange={(event) =>
                updateField(
                  "fullName",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={initialData.email}
              readOnly
              className={readOnlyClass}
            />
          </Field>

          <Field label="Travel Agency / Organization">
            <input
              value={form.travelAgency}
              onChange={(event) =>
                updateField(
                  "travelAgency",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(event) =>
                updateField(
                  "phone",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Website">
            <input
              value={form.website}
              onChange={(event) =>
                updateField(
                  "website",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Membership">
            <input
              value={form.membership}
              onChange={(event) =>
                updateField(
                  "membership",
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Partner Type">
            <input
              value={
                initialData.partnerType
              }
              readOnly
              className={readOnlyClass}
            />
          </Field>

          <Field label="Agent Code">
            <input
              value={initialData.agentCode}
              readOnly
              className={readOnlyClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
            Finance
          </p>

          <h2 className="mt-1 text-lg font-semibold text-[#001F3F]">
            Billing & Invoice Details
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Keep these details
            current so Epoch
            Journeys can prepare
            quotations, proformas,
            invoices, and other
            commercial documents
            correctly.
          </p>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Field label="Legal Company / Organization Name *">
            <input
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
              required
            />
          </Field>

          <Field label="Company Registration Number">
            <input
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
            />
          </Field>

          <Field label="Tax Number / Tax ID">
            <input
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
            />
          </Field>

          <Field label="VAT Number">
            <input
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
            />
          </Field>

          <Field label="Billing Address *">
            <input
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
              required
            />
          </Field>

          <Field label="City *">
            <input
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
              required
            />
          </Field>

          <Field label="Invoice Contact Person">
            <input
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
              required
            />
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
            />
          </Field>

          <Field label="Invoice Phone">
            <input
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
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#001F3F]">
          Agency Logo
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Upload your agency
          logo to personalize
          client-facing vouchers.
        </p>

        {agentLogoUrl ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Current Logo
            </p>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={agentLogoUrl}
              alt="Agency logo"
              className="max-h-24 rounded-lg border border-slate-200 bg-white p-2"
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No logo uploaded yet.
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={(event) => {
              if (
                event.target.files &&
                event.target.files[0]
              ) {
                setLogoFile(
                  event.target.files[0],
                );

                setLogoSuccessMessage(
                  "",
                );

                setLogoErrorMessage(
                  "",
                );
              }
            }}
            className="block text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#001F3F] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:opacity-90"
          />

          <button
            type="button"
            onClick={handleLogoUpload}
            disabled={
              !logoFile ||
              uploadingLogo
            }
            className="rounded-xl bg-[#001F3F] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadingLogo
              ? "Uploading..."
              : "Upload Logo"}
          </button>

          {agentLogoUrl ? (
            <button
              type="button"
              onClick={
                handleLogoDelete
              }
              disabled={
                deletingLogo
              }
              className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingLogo
                ? "Removing..."
                : "Remove Logo"}
            </button>
          ) : null}
        </div>

        {logoFile ? (
          <p className="mt-2 text-xs text-slate-500">
            Selected file:{" "}
            {logoFile.name}
          </p>
        ) : null}

        <p className="mt-2 text-xs text-slate-500">
          Recommended: PNG with
          transparent background,
          maximum 2 MB.
        </p>

        {logoErrorMessage ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {logoErrorMessage}
          </div>
        ) : null}

        {logoSuccessMessage ? (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {logoSuccessMessage}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending
              ? "Saving..."
              : "Save Profile"}
          </button>
        </div>
      </section>
    </form>
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
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";

const readOnlyClass =
  "min-h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500";
