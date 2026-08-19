"use client";

import { useEffect, useMemo } from "react";

type Props = {
  validUntil: string;
  availabilityNotes: string;
  nextStepNotes: string;
  onValidUntilChange: (value: string) => void;
  onAvailabilityNotesChange: (value: string) => void;
  onNextStepNotesChange: (value: string) => void;
};

const DEFAULT_VALIDITY_DAYS = 14;

const DEFAULT_AVAILABILITY_TEXT =
  "This quotation is subject to availability. No hotel rooms, transportation, guides, church arrangements, restaurants, or other services are being held unless specifically stated. Rates and availability will be reconfirmed upon written acceptance of the proposal.";

const DEFAULT_NEXT_STEP_TEXT =
  "To proceed, please provide written acceptance of this proposal together with the required group and billing information. Epoch Journeys will reconfirm availability and issue the Tour Proposal / Confirmation, including the applicable payment schedule, supplier-specific cancellation conditions, and deposit instructions.";

function formatInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function parseDateInput(value: string): Date | null {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day, 12, 0, 0);
}

function formatDisplayDate(value: string): string {
  const date = parseDateInput(value);

  if (!date) return "Not selected";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function QuoteValiditySection({
  validUntil,
  availabilityNotes,
  nextStepNotes,
  onValidUntilChange,
  onAvailabilityNotesChange,
  onNextStepNotesChange,
}: Props) {
  const suggestedValidUntil = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    return formatInputDate(
      addDays(today, DEFAULT_VALIDITY_DAYS)
    );
  }, []);

  useEffect(() => {
    if (!validUntil) {
      onValidUntilChange(suggestedValidUntil);
    }

    if (!availabilityNotes.trim()) {
      onAvailabilityNotesChange(DEFAULT_AVAILABILITY_TEXT);
    }

    if (!nextStepNotes.trim()) {
      onNextStepNotesChange(DEFAULT_NEXT_STEP_TEXT);
    }
  }, [
    validUntil,
    availabilityNotes,
    nextStepNotes,
    suggestedValidUntil,
    onValidUntilChange,
    onAvailabilityNotesChange,
    onNextStepNotesChange,
  ]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="bg-[#001F3F] px-5 py-4 text-white">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
          Client-Facing Terms
        </div>

        <h2 className="mt-1 text-lg font-semibold">
          Validity, Availability & Next Step
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-200">
          Set how long the quotation remains valid and clearly explain
          availability and the confirmation process to the agency.
        </p>
      </div>

      <div className="space-y-6 p-5">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <label className="block w-full max-w-sm">
              <span className="mb-1 block text-sm font-medium text-[#001F3F]">
                Quotation Valid Until
              </span>

              <input
                type="date"
                className="w-full rounded-md border bg-white p-2"
                value={validUntil}
                onChange={(e) =>
                  onValidUntilChange(e.target.value)
                }
              />

              <span className="mt-1 block text-xs text-slate-500">
                Standard suggestion: 14 days from the quotation date.
              </span>
            </label>

            <button
              type="button"
              onClick={() =>
                onValidUntilChange(suggestedValidUntil)
              }
              className="rounded-md border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-[#001F3F] transition hover:bg-blue-100"
            >
              Reset to 14 Days
            </button>
          </div>

          <div className="mt-4 rounded-md border bg-white p-3 text-sm text-slate-700">
            <strong>Proposal wording:</strong>{" "}
            This quotation is valid until{" "}
            <strong>
              {formatDisplayDate(validUntil)}
            </strong>
            , subject to availability.
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-[#001F3F]">
                Availability
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                This wording will appear in the client-facing proposal.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onAvailabilityNotesChange(DEFAULT_AVAILABILITY_TEXT)
              }
              className="self-start rounded-md border px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Use Standard Wording
            </button>
          </div>

          <textarea
            className="min-h-36 w-full resize-y rounded-md border p-4 text-sm leading-6"
            value={availabilityNotes}
            onChange={(e) =>
              onAvailabilityNotesChange(e.target.value)
            }
            placeholder="Availability conditions"
          />
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-[#001F3F]">
                How to Proceed / Next Step
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Give the agency a clear instruction for accepting the offer.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onNextStepNotesChange(DEFAULT_NEXT_STEP_TEXT)
              }
              className="self-start rounded-md border px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Use Standard Wording
            </button>
          </div>

          <textarea
            className="min-h-40 w-full resize-y rounded-md border p-4 text-sm leading-6"
            value={nextStepNotes}
            onChange={(e) =>
              onNextStepNotesChange(e.target.value)
            }
            placeholder="How the agency should proceed"
          />
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Proposal Preview
          </div>

          <div className="mt-3 space-y-4 text-sm leading-6 text-slate-700">
            <div>
              <div className="font-semibold text-[#001F3F]">
                Quotation Validity
              </div>

              <p className="mt-1">
                This quotation is valid until{" "}
                <strong>
                  {formatDisplayDate(validUntil)}
                </strong>
                , subject to availability.
              </p>
            </div>

            <div>
              <div className="font-semibold text-[#001F3F]">
                Availability
              </div>

              <p className="mt-1 whitespace-pre-line">
                {availabilityNotes}
              </p>
            </div>

            <div>
              <div className="font-semibold text-[#001F3F]">
                How to Proceed
              </div>

              <p className="mt-1 whitespace-pre-line">
                {nextStepNotes}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
