"use client";

import { useState, useTransition } from "react";

type ProfileFormProps = {
  initialData: {
    fullName: string;
    email: string;
    phone: string;
    travelAgency: string;
    agentLogoUrl: string;
  };
};

type ApiResponse = {
  success?: boolean;
  error?: string;
};

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState(initialData.fullName);
  const [email] = useState(initialData.email);
  const [phone, setPhone] = useState(initialData.phone);
  const [travelAgency, setTravelAgency] = useState(initialData.travelAgency);
  const [agentLogoUrl] = useState(initialData.agentLogoUrl);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/b2b/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName,
            phone,
            travelAgency,
          }),
        });

        const data = (await response.json()) as ApiResponse;

        if (!response.ok) {
          setErrorMessage(data.error || "Failed to update profile.");
          return;
        }

        setSuccessMessage("Profile updated successfully.");
      } catch (error) {
        console.error("PROFILE_UPDATE_CLIENT_ERROR", error);
        setErrorMessage("Something went wrong while saving your profile.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="fullName"
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label
              htmlFor="travelAgency"
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Travel Agency
            </label>
            <input
              id="travelAgency"
              type="text"
              value={travelAgency}
              onChange={(e) => setTravelAgency(e.target.value)}
              placeholder="Your travel agency"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              readOnly
              className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-500 outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Email cannot be changed here.
            </p>
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Phone
            </label>
            <input
              id="phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Your phone number"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-[#8B0000]"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-gray-300 p-5">
          <h2 className="text-sm font-semibold text-[#001F3F]">Agency Logo</h2>
          <p className="mt-1 text-sm text-gray-600">
            In the next step, we will add logo upload here. Once uploaded, your
            logo will appear on client-facing vouchers.
          </p>

          {agentLogoUrl ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Current Logo
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={agentLogoUrl}
                alt="Agency logo"
                className="max-h-24 rounded-lg border border-gray-200 bg-white p-2"
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No logo uploaded yet.</p>
          )}
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        ) : null}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}