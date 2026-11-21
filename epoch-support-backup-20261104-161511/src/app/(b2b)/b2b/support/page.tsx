"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function B2BSupportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const bookingId = searchParams.get("bookingId") || "";
  const requestType = searchParams.get("type") || "";

  const [subject, setSubject] = useState(
    requestType === "passengers"
      ? "Passenger List Upload Request"
      : requestType === "rooming"
        ? "Rooming List Assistance"
        : ""
  );

  const [message, setMessage] = useState(
    bookingId
      ? `Booking ID: ${bookingId}\n${requestType ? `Request Type: ${requestType}\n` : ""}`
      : ""
  );

  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      alert("Please fill in subject and message.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("subject", subject.trim());
      formData.append("message", message.trim());

      if (bookingId) {
        formData.append("bookingId", bookingId);
      }

      if (requestType) {
        formData.append("requestType", requestType);
      }

      if (file) {
        formData.append("file", file);
      }

      const response = await fetch("/api/b2b/support", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        alert(data?.error || "Failed to send support request.");
        return;
      }

      alert("Support request sent successfully.");

      setSubject("");
      setMessage("");
      setFile(null);

      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-[#001F3F]">Support</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Contact our team for booking help, operational questions, passenger
          list uploads, rooming list assistance, and urgent requests.
        </p>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
          Quick Support
        </h2>

        {(bookingId || requestType) && (
          <div className="mb-4 flex flex-wrap gap-3">
            {bookingId && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Booking ID: {bookingId}
              </span>
            )}

            {requestType && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                Type: {requestType}
              </span>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject"
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Message
            </label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message"
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Attach File (Optional)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Upload passenger list, rooming list, or other supporting file.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#6f0000] disabled:opacity-60"
          >
            {isSubmitting ? "Sending..." : "Send Support Request"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[#001F3F]">
          Need immediate assistance?
        </h2>

        <p className="text-sm text-muted-foreground">
          For urgent operational support, please contact the operations team
          directly.
        </p>

        <div className="mt-4">
          <Link
            href="/b2b/bookings"
            className="text-sm font-medium text-[#8B0000] hover:underline"
          >
            View My Bookings
          </Link>
        </div>
      </section>
    </div>
  );
}