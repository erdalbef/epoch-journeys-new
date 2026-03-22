"use client";

import { useState } from "react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setSuccess(false);
    setError(null);

    const form = e.currentTarget;

    const fullName = (form.elements.namedItem("name") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const message = (form.elements.namedItem("message") as HTMLTextAreaElement).value;

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to send message.");
        return;
      }

      setSuccess(true);
      form.reset();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-[#f8f9fb] text-black">
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8B0000]">
          Contact
        </p>

        <h1 className="mt-4 text-4xl font-semibold text-[#001F3F] sm:text-5xl">
          Get in touch with our team
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
          For partnership inquiries, program development, or general questions,
          our team will be happy to assist you.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold text-[#001F3F]">
                Contact Details
              </h2>

              <div className="mt-6 space-y-4 text-gray-700">
                <p>
                  <strong>Company:</strong> Epoch Journeys OOD
                </p>

                <p>
                  <strong>Address:</strong>
                  <br />
                  107 Tsar Boris III Blvd, Floor 7
                  <br />
                  Sofia 1612, Bulgaria
                </p>

                <p>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:info@epochjourneys.com"
                    className="text-[#8B0000] hover:underline"
                  >
                    info@epochjourneys.com
                  </a>
                </p>

                <p>
                  <strong>Website:</strong>{" "}
                  <a
                    href="https://www.epochjourneys.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#8B0000] hover:underline"
                  >
                    www.epochjourneys.com
                  </a>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#001F3F]">
                Business Hours
              </h3>

              <p className="mt-3 text-sm text-gray-600">
                Monday - Friday: 09:00 - 18:00 (EET)
              </p>

              <p className="mt-2 text-sm text-gray-600">
                We aim to respond to all inquiries within one business day.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
            <h2 className="text-2xl font-semibold text-[#001F3F]">
              Send a Message
            </h2>

            {success && (
              <p className="mt-4 text-sm text-green-600">
                Your message has been sent successfully.
              </p>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <input
                name="name"
                required
                placeholder="Full Name"
                className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />

              <input
                name="email"
                type="email"
                required
                placeholder="Email Address"
                className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />

              <textarea
                name="message"
                required
                placeholder="Your message"
                rows={5}
                className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#8B0000] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}