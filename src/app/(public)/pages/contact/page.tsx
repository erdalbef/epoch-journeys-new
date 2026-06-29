"use client";

import { useState } from "react";
import {
  Building2,
  Mail,
  Clock,
  Handshake,
  MessageCircle,
} from "lucide-react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setSuccess(false);
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const fullName = String(formData.get("name") || "").trim();
    const organization = String(formData.get("organization") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const country = String(formData.get("country") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const honeypot = String(formData.get("companyWebsite") || "").trim();

    if (honeypot) {
      setLoading(false);
      setSuccess(true);
      form.reset();
      return;
    }

    if (message.length < 20) {
      setError("Please include a little more detail in your message.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          organization,
          email,
          country,
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
    <main className="bg-white text-black">
      <section className="bg-[#F7F3EA] px-6 py-24 text-center sm:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24D]">
            Contact Epoch Journeys
          </p>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#0B1F3A] sm:text-5xl">
            Let’s Start the Conversation
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            Whether you are planning your first pilgrimage or looking for a
            trusted destination management partner, our team is ready to help.
          </p>
        </div>
      </section>

      <section className="px-6 py-24 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C9A24D]">
              How Can We Help?
            </p>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#0B1F3A] sm:text-4xl">
              Tell Us About Your Pilgrimage
            </h2>

            <p className="mt-6 text-lg leading-8 text-gray-600">
              Share your destination, group size, dates, or early ideas. We will
              review your message and respond with the next practical step.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              <InfoCard
                icon={Building2}
                title="Head Office"
                text="Epoch Journeys OOD, Sofia, Bulgaria"
              />
              <InfoCard
                icon={Mail}
                title="Email"
                text="info@epochjourneys.com"
              />
              <InfoCard
                icon={Clock}
                title="Business Hours"
                text="Monday–Friday, 09:00–18:00 EET"
              />
              <InfoCard
                icon={Handshake}
                title="Partnerships"
                text="Agencies, dioceses, parishes, and pilgrimage leaders"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-[0_12px_34px_rgba(0,0,0,0.05)]">
            <h2 className="text-2xl font-semibold text-[#0B1F3A]">
              Send a Message
            </h2>

            {success && (
              <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                Your message has been sent successfully.
              </p>
            )}

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <input
                name="companyWebsite"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
              />

              <input
                name="name"
                required
                placeholder="Full Name"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#C9A24D]"
              />

              <input
                name="organization"
                placeholder="Organization / Parish / Agency"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#C9A24D]"
              />

              <input
                name="email"
                type="email"
                required
                placeholder="Email Address"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#C9A24D]"
              />

              <input
                name="country"
                placeholder="Country"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#C9A24D]"
              />

              <textarea
                name="message"
                required
                placeholder="Tell us about your pilgrimage plans"
                rows={6}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#C9A24D]"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#C9A24D] px-6 py-3.5 text-sm font-semibold text-[#0B1F3A] transition hover:bg-[#0B1F3A] hover:text-[#C9A24D] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="bg-[#0B1F3A] px-6 py-24 text-center text-white sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl">
          <MessageCircle className="mx-auto text-[#C9A24D]" size={34} />

          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            We’re Ready to Help
          </h2>

          <p className="mt-6 text-lg leading-8 text-white/75">
            We would be delighted to learn about your pilgrimage plans and
            explore how Epoch Journeys can support your organization.
          </p>
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_10px_28px_rgba(0,0,0,0.04)]">
      <Icon className="text-[#C9A24D]" size={26} />
      <h3 className="mt-4 text-lg font-semibold text-[#0B1F3A]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-gray-600">{text}</p>
    </div>
  );
}