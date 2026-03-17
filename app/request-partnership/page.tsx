"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type FormState = {
  fullName: string;
  email: string;
  agency: string;
  country: string;
  message: string;
};

const initialState: FormState = {
  fullName: "",
  email: "",
  agency: "",
  country: "",
  message: "",
};

export default function RequestPartnershipPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/request-partnership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data: { success?: boolean; message?: string } =
        await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(
          data.message || "Something went wrong. Please try again."
        );
        return;
      }

      setSuccessMessage(
        "Thank you for your interest. We will contact you when the partner platform is ready."
      );
      setForm(initialState);
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="bg-white text-black">
      <section className="mx-auto max-w-5xl px-6 py-16 sm:px-10 lg:px-16 lg:py-20">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#8B0000]">
            Partnership
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#001F3F] sm:text-5xl">
            Partner with Epoch Journeys
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-gray-600 sm:text-lg">
            We collaborate with travel advisors, tour operators, and group
            leaders interested in cultural, historical, and pilgrimage travel
            experiences across Europe.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24 sm:px-10 lg:px-16">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-gray-200 bg-[#faf7f4] p-8 shadow-sm sm:p-10">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#8B0000]">
              Early Access
            </p>

            <h2 className="mt-3 text-3xl font-semibold text-[#001F3F]">
              Our B2B platform is launching soon
            </h2>

            <div className="mt-6 space-y-5 text-base leading-8 text-gray-600">
              <p>
                The Epoch Journeys partner platform is currently in its final
                preparation phase.
              </p>

              <p>
                Travel professionals interested in working with us are welcome
                to leave their details below. We will notify you as soon as
                partner access becomes available.
              </p>

              <p>
                In the meantime, we continue to welcome partnership inquiries
                related to cultural, historical, pilgrimage, and custom group
                travel programs across Europe.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-[#8B0000]/15 bg-white p-6">
              <h3 className="text-lg font-semibold text-[#001F3F]">
                Who this is for
              </h3>

              <ul className="mt-4 space-y-3 text-sm leading-7 text-gray-600">
                <li>• Travel advisors</li>
                <li>• Tour operators</li>
                <li>• Group leaders</li>
                <li>• Faith, culture, and special-interest travel planners</li>
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
            <h2 className="text-2xl font-semibold text-[#001F3F]">
              Request Early Access
            </h2>

            <p className="mt-3 text-sm leading-7 text-gray-600">
              Leave your details and we will contact you when the platform is
              ready.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="fullName"
                  className="text-sm font-medium text-[#001F3F]"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B0000]"
                  placeholder="Your full name"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-[#001F3F]"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B0000]"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="agency"
                  className="text-sm font-medium text-[#001F3F]"
                >
                  Travel Agency / Company
                </label>
                <input
                  id="agency"
                  name="agency"
                  type="text"
                  value={form.agency}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, agency: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B0000]"
                  placeholder="Agency or company name"
                />
              </div>

              <div>
                <label
                  htmlFor="country"
                  className="text-sm font-medium text-[#001F3F]"
                >
                  Country
                </label>
                <input
                  id="country"
                  name="country"
                  type="text"
                  value={form.country}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, country: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B0000]"
                  placeholder="Country"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="text-sm font-medium text-[#001F3F]"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  value={form.message}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, message: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B0000]"
                  placeholder="Tell us a little about your business or the type of programs you are interested in."
                />
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-full bg-[#8B0000] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Submitting..." : "Request Early Access"}
              </button>
            </form>

            <p className="mt-5 text-xs leading-6 text-gray-500">
              Thank you for your interest in Epoch Journeys. We will review your
              request and notify you when partner access becomes available.
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-[#001F3F] underline underline-offset-4"
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
}