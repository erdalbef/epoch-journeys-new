"use client";

import { FormEvent, useState } from "react";

type ContactFormState = {
  fullName: string;
  email: string;
  company: string;
  subject: string;
  message: string;
};

const initialState: ContactFormState = {
  fullName: "",
  email: "",
  company: "",
  subject: "",
  message: "",
};

export default function ContactPage() {
  const [form, setForm] = useState<ContactFormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
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
        "Thank you for contacting Epoch Journeys. We will respond as soon as possible."
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
            Contact
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#001F3F] sm:text-5xl">
            Contact Us
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-gray-600 sm:text-lg">
            We welcome inquiries from travel advisors, tour operators, and group
            leaders interested in working with Epoch Journeys.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-10 lg:px-16">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-gray-200 bg-[#faf7f4] p-8 shadow-sm sm:p-10">
            <h2 className="text-2xl font-semibold text-[#001F3F]">
              Head Office
            </h2>

            <div className="mt-6 space-y-3 text-sm leading-7 text-gray-600">
              <p>Epoch Journeys OOD</p>
              <p>107 Tsar Boris III Blvd, Floor 7</p>
              <p>Sofia 1612, Bulgaria</p>
              <p>
                <a
                  href="mailto:info@epochjourneys.com"
                  className="hover:text-[#001F3F]"
                >
                  info@epochjourneys.com
                </a>
              </p>
              <p>
                <a
                  href="https://www.epochjourneys.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#001F3F]"
                >
                  www.epochjourneys.com
                </a>
              </p>
            </div>

            <div className="mt-10 rounded-2xl border border-[#8B0000]/15 bg-white p-6">
              <h3 className="text-lg font-semibold text-[#001F3F]">
                Our Presence
              </h3>

              <ul className="mt-4 space-y-3 text-sm leading-7 text-gray-600">
                <li>• Spain Office</li>
                <li>• Greece Office</li>
                <li>• Turkey Office</li>
              </ul>
            </div>

            <p className="mt-8 text-sm leading-7 text-gray-600">
              We aim to respond to business and partnership inquiries as
              promptly as possible.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
            <h2 className="text-2xl font-semibold text-[#001F3F]">
              Send a Message
            </h2>

            <p className="mt-3 text-sm leading-7 text-gray-600">
              Use the form below to contact us directly.
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
                  htmlFor="company"
                  className="text-sm font-medium text-[#001F3F]"
                >
                  Company / Agency
                </label>
                <input
                  id="company"
                  type="text"
                  value={form.company}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, company: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B0000]"
                  placeholder="Company or agency name"
                />
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="text-sm font-medium text-[#001F3F]"
                >
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={form.subject}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B0000]"
                  placeholder="Subject"
                  required
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
                  rows={6}
                  value={form.message}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, message: e.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#8B0000]"
                  placeholder="Write your message here"
                  required
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
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}