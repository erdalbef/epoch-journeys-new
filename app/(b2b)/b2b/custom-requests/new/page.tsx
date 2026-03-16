"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  requestType: "TAILOR_MADE" | "BESPOKE_GROUP";
  title: string;
  destination: string;
  destinations: string;
  startDate: string;
  endDate: string;
  durationDays: string;
  estimatedPax: string;
  adults: string;
  children: string;
  budgetPerPerson: string;
  currency: string;
  accommodationLevel: string;
  roomPreference: string;
  needsFlights: boolean;
  landOnly: boolean;
  groupName: string;
  groupLeaderName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
};

const initialForm: FormState = {
  requestType: "TAILOR_MADE",
  title: "",
  destination: "",
  destinations: "",
  startDate: "",
  endDate: "",
  durationDays: "",
  estimatedPax: "",
  adults: "",
  children: "",
  budgetPerPerson: "",
  currency: "EUR",
  accommodationLevel: "",
  roomPreference: "",
  needsFlights: false,
  landOnly: true,
  groupName: "",
  groupLeaderName: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  notes: "",
};

function parseDestinations(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function NewCustomRequestPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const destinationPreview = useMemo(() => {
    return parseDestinations(form.destinations);
  }, [form.destinations]);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;

      if (name === "needsFlights") {
        setForm((prev) => ({
          ...prev,
          needsFlights: checked,
          landOnly: checked ? false : prev.landOnly,
        }));
        return;
      }

      if (name === "landOnly") {
        setForm((prev) => ({
          ...prev,
          landOnly: checked,
          needsFlights: checked ? false : prev.needsFlights,
        }));
        return;
      }

      setForm((prev) => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {
        requestType: form.requestType,
        title: form.title.trim() || null,
        destination: form.destination.trim() || null,
        destinations: parseDestinations(form.destinations),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        durationDays: form.durationDays ? Number(form.durationDays) : null,
        estimatedPax: form.estimatedPax ? Number(form.estimatedPax) : null,
        adults: form.adults ? Number(form.adults) : null,
        children: form.children ? Number(form.children) : null,
        budgetPerPerson: form.budgetPerPerson
          ? Number(form.budgetPerPerson)
          : null,
        currency: form.currency,
        accommodationLevel: form.accommodationLevel.trim() || null,
        roomPreference: form.roomPreference.trim() || null,
        needsFlights: form.needsFlights,
        landOnly: form.landOnly,
        groupName: form.groupName.trim() || null,
        groupLeaderName: form.groupLeaderName.trim() || null,
        customerName: form.customerName.trim() || null,
        customerEmail: form.customerEmail.trim() || null,
        customerPhone: form.customerPhone.trim() || null,
        notes: form.notes.trim() || null,
      };

      const res = await fetch("/api/b2b/custom-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as
        | { id?: string; requestReference?: string; error?: string }
        | undefined;

      if (!res.ok) {
        setError(data?.error || "Something went wrong while submitting.");
        setLoading(false);
        return;
      }

      setSuccessMessage(
        data?.requestReference
          ? `Request submitted successfully. Reference: ${data.requestReference}`
          : "Request submitted successfully."
      );

      if (data?.id) {
        router.push(`/b2b/custom-requests/${data.id}`);
        return;
      }

      router.push("/b2b/custom-requests");
    } catch {
      setError("Something went wrong while submitting.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#001F3F]">
          Request a Custom Tour
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Submit a tailor-made program request for Epoch Journeys OOD. Use this
          form for bespoke FITs, pilgrimage groups, and special-interest
          itineraries that do not match published departures.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-2xl border bg-white p-6 shadow-sm"
      >
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Request Overview
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="requestType"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Request Type
              </label>
              <select
                id="requestType"
                name="requestType"
                value={form.requestType}
                onChange={handleChange}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              >
                <option value="TAILOR_MADE">Tailor-Made</option>
                <option value="BESPOKE_GROUP">Bespoke Group</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Working Title
              </label>
              <input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Example: St. Paul Pilgrimage in Greece"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>

            <div>
              <label
                htmlFor="destination"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Main Destination
              </label>
              <input
                id="destination"
                name="destination"
                value={form.destination}
                onChange={handleChange}
                placeholder="Example: Greece"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>

            <div>
              <label
                htmlFor="destinations"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Multiple Destinations
              </label>
              <input
                id="destinations"
                name="destinations"
                value={form.destinations}
                onChange={handleChange}
                placeholder="Example: Greece, Turkey, Italy"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
              <p className="mt-2 text-xs text-slate-500">
                Separate destinations with commas.
              </p>
              {destinationPreview.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {destinationPreview.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Travel Timing
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="startDate"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Preferred Start Date
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={handleChange}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>

            <div>
              <label
                htmlFor="endDate"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Preferred End Date
              </label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={handleChange}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>

            <div>
              <label
                htmlFor="durationDays"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Duration (Days)
              </label>
              <input
                id="durationDays"
                name="durationDays"
                type="number"
                min="1"
                value={form.durationDays}
                onChange={handleChange}
                placeholder="Example: 10"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Group Details
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="estimatedPax"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Estimated Pax
              </label>
              <input
                id="estimatedPax"
                name="estimatedPax"
                type="number"
                min="1"
                value={form.estimatedPax}
                onChange={handleChange}
                placeholder="Example: 24"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>

            <div>
              <label
                htmlFor="adults"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Adults
              </label>
              <input
                id="adults"
                name="adults"
                type="number"
                min="0"
                value={form.adults}
                onChange={handleChange}
                placeholder="Example: 20"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>

            <div>
              <label
                htmlFor="children"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Children
              </label>
              <input
                id="children"
                name="children"
                type="number"
                min="0"
                value={form.children}
                onChange={handleChange}
                placeholder="Example: 4"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>

            <div>
              <label
                htmlFor="groupName"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Group Name
              </label>
              <input
                id="groupName"
                name="groupName"
                value={form.groupName}
                onChange={handleChange}
                placeholder="Example: St. Paul Parish Group"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>

            <div>
              <label
                htmlFor="groupLeaderName"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Group Leader
              </label>
              <input
                id="groupLeaderName"
                name="groupLeaderName"
                value={form.groupLeaderName}
                onChange={handleChange}
                placeholder="Example: Fr. Michael"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Budget & Service Preferences
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="budgetPerPerson"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Budget Per Person
              </label>
              <input
                id="budgetPerPerson"
                name="budgetPerPerson"
                type="number"
                min="0"
                step="0.01"
                value={form.budgetPerPerson}
                onChange={handleChange}
                placeholder="Example: 1450"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>

            <div>
              <label
                htmlFor="currency"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={form.currency}
                onChange={handleChange}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="accommodationLevel"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Accommodation Level
              </label>
              <select
                id="accommodationLevel"
                name="accommodationLevel"
                value={form.accommodationLevel}
                onChange={handleChange}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              >
                <option value="">Select</option>
                <option value="STANDARD_3_STAR">Standard 3-Star</option>
                <option value="COMFORT_4_STAR">Comfort 4-Star</option>
                <option value="PREMIUM_5_STAR">Premium 5-Star</option>
                <option value="MIXED">Mixed</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="roomPreference"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Room Preference
              </label>
              <input
                id="roomPreference"
                name="roomPreference"
                value={form.roomPreference}
                onChange={handleChange}
                placeholder="Example: Twin / Double mix"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="needsFlights"
                checked={form.needsFlights}
                onChange={handleChange}
              />
              Include Flights
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="landOnly"
                checked={form.landOnly}
                onChange={handleChange}
              />
              Land Only
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Contact Information
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="customerName"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Customer / Contact Name
              </label>
              <input
                id="customerName"
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="Example: John Smith"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>

            <div>
              <label
                htmlFor="customerEmail"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Customer / Contact Email
              </label>
              <input
                id="customerEmail"
                name="customerEmail"
                type="email"
                value={form.customerEmail}
                onChange={handleChange}
                placeholder="Example: john@example.com"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>

            <div>
              <label
                htmlFor="customerPhone"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Customer / Contact Phone
              </label>
              <input
                id="customerPhone"
                name="customerPhone"
                value={form.customerPhone}
                onChange={handleChange}
                placeholder="Example: +1 555 123 4567"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Program Notes
          </h2>

          <div>
            <label
              htmlFor="notes"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Notes / Requirements
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={6}
              value={form.notes}
              onChange={handleChange}
              placeholder="Please include special interests, pilgrimage focus, hotel preferences, guide language, church visits, meals, accessibility needs, or any other important details."
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            />
          </div>
        </section>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/b2b/custom-requests")}
            className="rounded-xl border px-6 py-3 text-sm font-medium transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Back to Requests
          </button>
        </div>
      </form>
    </div>
  );
}