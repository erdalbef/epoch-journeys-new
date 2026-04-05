"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type PassengerFormValues = {
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  email: string;
  phone: string;
  passportNumber: string;
  passportExpiry: string;
  passportIssueDate: string;
  passportCountry: string;
  roomType: string;
  isLeadPassenger: boolean;
  specialRequests: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
};

type PassengerFormProps = {
  mode: "create" | "edit";
  bookingId: string;
  passengerId?: string;
  initialValues?: Partial<PassengerFormValues>;
  cancelHref: string;
  afterSaveHref: string;
};

function toDateInputValue(value?: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function PassengerForm({
  mode,
  bookingId,
  passengerId,
  initialValues,
  cancelHref,
  afterSaveHref,
}: PassengerFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState<PassengerFormValues>({
    title: initialValues?.title ?? "",
    firstName: initialValues?.firstName ?? "",
    middleName: initialValues?.middleName ?? "",
    lastName: initialValues?.lastName ?? "",
    gender: initialValues?.gender ?? "",
    dateOfBirth: toDateInputValue(initialValues?.dateOfBirth),
    nationality: initialValues?.nationality ?? "",
    email: initialValues?.email ?? "",
    phone: initialValues?.phone ?? "",
    passportNumber: initialValues?.passportNumber ?? "",
    passportExpiry: toDateInputValue(initialValues?.passportExpiry),
    passportIssueDate: toDateInputValue(initialValues?.passportIssueDate),
    passportCountry: initialValues?.passportCountry ?? "",
    roomType: initialValues?.roomType ?? "",
    isLeadPassenger: initialValues?.isLeadPassenger ?? false,
    specialRequests: initialValues?.specialRequests ?? "",
    emergencyContactName: initialValues?.emergencyContactName ?? "",
    emergencyContactPhone: initialValues?.emergencyContactPhone ?? "",
    notes: initialValues?.notes ?? "",
  });

  function updateField<K extends keyof PassengerFormValues>(
    key: K,
    value: PassengerFormValues[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim()) {
      alert("First name and last name are required.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        bookingId,
        title: form.title || null,
        firstName: form.firstName.trim(),
        middleName: form.middleName || null,
        lastName: form.lastName.trim(),
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
        nationality: form.nationality || null,
        email: form.email || null,
        phone: form.phone || null,
        passportNumber: form.passportNumber || null,
        passportExpiry: form.passportExpiry || null,
        passportIssueDate: form.passportIssueDate || null,
        passportCountry: form.passportCountry || null,
        roomType: form.roomType || null,
        isLeadPassenger: form.isLeadPassenger,
        specialRequests: form.specialRequests || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
        notes: form.notes || null,
      };

      const response = await fetch(
        mode === "create"
          ? `/api/b2b/bookings/${bookingId}/passengers`
          : `/api/b2b/passengers/${passengerId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        alert(data?.error || "Something went wrong.");
        return;
      }

      router.push(afterSaveHref);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!passengerId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this passenger?"
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/b2b/passengers/${passengerId}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        alert(data?.error || "Failed to delete passenger.");
        return;
      }

      router.push(afterSaveHref);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#001F3F]">
          {mode === "create" ? "Add Passenger" : "Edit Passenger"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter passenger details carefully, especially passport-related fields.
        </p>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
          Basic Information
        </h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Title">
            <input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>

          <Field label="First Name *">
            <input
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              required
            />
          </Field>

          <Field label="Middle Name">
            <input
              value={form.middleName}
              onChange={(e) => updateField("middleName", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Last Name *">
            <input
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              required
            />
          </Field>

          <Field label="Gender">
            <select
              value={form.gender}
              onChange={(e) => updateField("gender", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            >
              <option value="">Select</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>

          <Field label="Date of Birth">
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => updateField("dateOfBirth", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Nationality">
            <input
              value={form.nationality}
              onChange={(e) => updateField("nationality", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Room Type">
            <input
              value={form.roomType}
              onChange={(e) => updateField("roomType", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Single / Double / Twin / Triple"
            />
          </Field>
        </div>

        <div className="mt-4">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-[#001F3F]">
            <input
              type="checkbox"
              checked={form.isLeadPassenger}
              onChange={(e) => updateField("isLeadPassenger", e.target.checked)}
            />
            Lead Passenger
          </label>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
          Contact Information
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
          Passport Information
        </h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Passport Number">
            <input
              value={form.passportNumber}
              onChange={(e) => updateField("passportNumber", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Passport Expiry">
            <input
              type="date"
              value={form.passportExpiry}
              onChange={(e) => updateField("passportExpiry", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Passport Issue Date">
            <input
              type="date"
              value={form.passportIssueDate}
              onChange={(e) => updateField("passportIssueDate", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Passport Country">
            <input
              value={form.passportCountry}
              onChange={(e) => updateField("passportCountry", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
          Emergency & Notes
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Emergency Contact Name">
            <input
              value={form.emergencyContactName}
              onChange={(e) =>
                updateField("emergencyContactName", e.target.value)
              }
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Emergency Contact Phone">
            <input
              value={form.emergencyContactPhone}
              onChange={(e) =>
                updateField("emergencyContactPhone", e.target.value)
              }
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4">
          <Field label="Special Requests">
            <textarea
              value={form.specialRequests}
              onChange={(e) => updateField("specialRequests", e.target.value)}
              className="min-h-25 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              className="min-h-25 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#6f0000] disabled:opacity-60"
        >
          {isSaving
            ? "Saving..."
            : mode === "create"
              ? "Create Passenger"
              : "Save Changes"}
        </button>

        <Link
          href={cancelHref}
          className="rounded-xl border px-5 py-3 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
        >
          Cancel
        </Link>

        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete Passenger"}
          </button>
        )}
      </div>
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
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#001F3F]">{label}</label>
      {children}
    </div>
  );
}