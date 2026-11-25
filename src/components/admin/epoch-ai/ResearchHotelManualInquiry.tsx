"use client";

import { useState } from "react";
import { inquiry, type Stay } from "@/lib/epoch-ai/hotelProcurement";

type Props = {
  hotelName: string;
  stay: Stay;
  initialEmail: string;
  contactVerified: boolean;
};

export default function ResearchHotelManualInquiry({
  hotelName,
  stay,
  initialEmail,
  contactVerified,
}: Props) {
  const template = inquiry(stay, hotelName);
  const recipient = initialEmail;
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [notice, setNotice] = useState("");

  const ready =
    contactVerified &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim()) &&
    template.errors.length === 0;

  async function copy(value: string) {
    if (!ready) {
      setNotice("Verify the hotel's published email and contact source first.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copied. Review the message before sending manually.");
    } catch {
      setNotice("Clipboard unavailable. Select and copy the text manually.");
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-blue-300 bg-blue-50 p-4">
      <h3 className="font-bold text-[#001F3F]">
        Prepare Manual Inquiry — Research Hotel
      </h3>
      <p className="text-sm">
        This hotel is not registered in Supplier CRM. You may prepare
        an inquiry without registering it. Nothing is saved or sent.
      </p>

      <label className="block text-sm font-medium">
        Hotel
        <input
          readOnly
          value={hotelName}
          className="mt-1 w-full rounded border bg-slate-100 p-2"
        />
      </label>

      <label className="block text-sm font-medium">
        Recipient from hotel research
        <input
          type="email"
          value={recipient}
          readOnly
          className="mt-1 w-full rounded border bg-white p-2"
        />
      </label>

      <label className="block text-sm font-medium">
        Subject
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="mt-1 w-full rounded border bg-white p-2"
        />
      </label>

      <label className="block text-sm font-medium">
        Inquiry message
        <textarea
          rows={17}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="mt-1 w-full rounded border bg-white p-2 font-mono text-xs"
        />
      </label>

      {!contactVerified ? (
        <p className="text-sm text-amber-900">
          Verify the published contact email and official contact source
          in the research section before copying.
        </p>
      ) : null}

      {template.errors.map((error) => (
        <p key={error} className="text-sm text-red-800">{error}</p>
      ))}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!ready}
          onClick={() => void copy(recipient)}
          className="rounded border border-[#001F3F] bg-white px-3 py-2 text-sm disabled:opacity-40"
        >
          Copy recipient
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => void copy(subject)}
          className="rounded border border-[#001F3F] bg-white px-3 py-2 text-sm disabled:opacity-40"
        >
          Copy subject
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => void copy(body)}
          className="rounded bg-[#001F3F] px-3 py-2 text-sm text-white disabled:opacity-40"
        >
          Copy inquiry
        </button>
      </div>

      {notice ? <p role="status" className="text-sm">{notice}</p> : null}

      <p className="text-xs text-slate-700">
        Unsaved manual draft. Add the standard Epoch Journeys branded
        signature in your email application. Do not send until reviewed.
        This action does not register a supplier or create inquiry history.
      </p>
    </section>
  );
}
