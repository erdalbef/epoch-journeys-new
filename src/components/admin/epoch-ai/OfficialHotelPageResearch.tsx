"use client";

import { useEffect, useRef, useState } from "react";
import type { OfficialPageExtraction } from "@/lib/epoch-ai/hotelOfficialPageExtraction";

type Result = {
  hotelName: string;
  purpose: "contact" | "facilities";
  sourceUrl: string;
  status: "requires-admin-verification";
  extraction: OfficialPageExtraction;
};

type Purpose = "contact" | "facilities";

export default function OfficialHotelPageResearch({
  hotelName, onContactRetrieved
}: {
  hotelName: string;
  onContactRetrieved?: (extraction: OfficialPageExtraction) => void;
}) {
  const [loading, setLoading] = useState<Purpose | null>(null);
  const [results, setResults] = useState<Partial<Record<Purpose, Result>>>({});
  const [errors, setErrors] = useState<Partial<Record<Purpose, string>>>({});
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => controller.current?.abort();
  }, []);

  async function retrieve(purpose: Purpose) {
    if (loading || !hotelName.trim()) return;

    const abort = new AbortController();
    controller.current = abort;
    setLoading(purpose);
    setErrors(previous => ({ ...previous, [purpose]: "" }));

    try {
      const response = await fetch(
        "/api/admin/epoch-ai/hotel-research/official-page",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hotelName, purpose }),
          signal: abort.signal,
          cache: "no-store"
        }
      );

      const body = await response.json() as Result & { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Official page retrieval unavailable");
      }

      if (
        body.hotelName !== hotelName ||
        body.purpose !== purpose ||
        body.status !== "requires-admin-verification" ||
        body.extraction?.sourceVerified !== false ||
        body.extraction.sourceUrl !== body.sourceUrl ||
        !body.sourceUrl.startsWith("https://")
      ) {
        throw new Error("Retrieved evidence identity could not be confirmed");
      }

      if (abort.signal.aborted) return;
      setResults(previous => ({ ...previous, [purpose]: body }));
      if (purpose === "contact") onContactRetrieved?.(body.extraction);
    } catch (error) {
      if (abort.signal.aborted) return;

      setErrors(previous => ({
        ...previous,
        [purpose]: error instanceof Error ? error.message : "Retrieval failed"
      }));
    } finally {
      if (!abort.signal.aborted) setLoading(null);
    }
  }

  return (
    <section
      aria-label="Official hotel website retrieval"
      className="rounded-lg border border-sky-200 bg-sky-50/50 p-3 space-y-3 text-xs"
    >
      <h4 className="font-semibold text-[#001F3F]">
        Official hotel website retrieval
      </h4>

      <p className="text-slate-700">
        Selected property: <strong>{hotelName}</strong>.
        Public research only. No contact is approved, no CRM record is
        changed, and no email is sent.
      </p>

      <p className="text-amber-900">
        Server retrieval is disabled by default. Until it is explicitly
        enabled, a retrieval request will return an unavailable message.
      </p>

      <div className="flex flex-wrap gap-2">
        {(["contact", "facilities"] as const).map(purpose => (
          <button
            key={purpose}
            type="button"
            disabled={loading !== null}
            onClick={() => void retrieve(purpose)}
            className="rounded-lg border border-blue-300 bg-white px-3 py-2 font-semibold text-[#001F3F] disabled:opacity-50"
          >
            {loading === purpose
              ? "Retrieving..."
              : purpose === "contact"
                ? "Retrieve official contact page"
                : "Retrieve official facilities page"}
          </button>
        ))}
      </div>

      {(["contact", "facilities"] as const).map(purpose => {
        const result = results[purpose];

        return (
          <div key={purpose} className="space-y-2">
            {errors[purpose] ? (
              <p role="alert" className="text-amber-900">
                {errors[purpose]}
              </p>
            ) : null}

            {result ? (
              <div
                className="rounded-lg border bg-white p-3 space-y-2"
                role="status"
              >
                <p className="font-semibold capitalize">
                  {purpose} — Requires Admin verification
                </p>

                <a
                  href={result.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-blue-700 underline"
                >
                  Inspect original source
                </a>

                <p className="font-semibold">Contact emails</p>

                {result.extraction.contacts.length ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {result.extraction.contacts.map((contact, index) => (
                      <li key={`${contact.email}:${index}`}>
                        {contact.email} ({contact.category})
                        {" — unverified"}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No contact email extracted from this page.</p>
                )}

                <p className="font-semibold">Telephone indications</p>
                <p>
                  {result.extraction.phones.length
                    ? result.extraction.phones.join("; ")
                    : "None extracted"}
                </p>

                <p className="font-semibold">Published room-count indications</p>
                <p>
                  {result.extraction.roomCounts.length
                    ? result.extraction.roomCounts.join("; ")
                    : "None extracted"}
                </p>

                <p className="text-amber-900">
                  These findings do not establish the hotel's room allotment,
                  accessibility, supplier identity, or contact approval.
                  Independently check the linked page before using any detail.
                </p>
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
