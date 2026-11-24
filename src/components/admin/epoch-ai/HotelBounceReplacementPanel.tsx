"use client";

import { useEffect, useRef, useState } from "react";

const REQUIRED_CC = "info@epochjourneys.com";

type ReplacementReview = {
  inquiryId: string;
  supplierName: string;
  to: string;
  cc: string;
  replyTo: string;
  subject: string;
  stay: {
    destination: string;
    checkIn: string;
    checkOut: string;
    rooms: number;
  };
  original: {
    outboxId: string;
    providerMessageId: string;
    recipient: string;
    status: string;
  };
  replacement: null | {
    status: string;
    providerMessageId: string | null;
    recipient: string;
    inquiryId: string;
  };
  eligible: boolean;
  sendEnabled: boolean;
  blocks: string[];
  previewHtml: string;
  previewText: string;
  fingerprint: string;
  bounceEvidence?: {
    recipient: string;
    eventId: string;
    occurredAt: string;
    message?: string;
  };
  deliveryTracking?: {
    code: string;
    label: string;
    delivered: boolean;
    requiresInvestigation: boolean;
  };
};

type ApiResult = Record<string, unknown> & {
  error?: string;
  blocks?: string[];
  status?: string;
  sent?: boolean;
  outboxCreated?: boolean;
};

async function readResult(response: Response): Promise<ApiResult> {
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("The email review returned an unexpected response.");
  }
  return result as ApiResult;
}

function responseError(result: ApiResult, fallback: string): string {
  const blocks = Array.isArray(result.blocks)
    ? result.blocks.filter((item): item is string => typeof item === "string")
    : [];
  return [typeof result.error === "string" ? result.error : fallback, ...blocks].join(" ");
}

function parseReview(result: ApiResult, inquiryId: string): ReplacementReview {
  const review = result as unknown as ReplacementReview;
  if (
    review.inquiryId !== inquiryId ||
    review.cc !== REQUIRED_CC ||
    typeof review.to !== "string" ||
    typeof review.subject !== "string" ||
    typeof review.fingerprint !== "string" ||
    !review.fingerprint ||
    typeof review.previewHtml !== "string" ||
    typeof review.eligible !== "boolean" ||
    typeof review.sendEnabled !== "boolean" ||
    typeof review.original?.outboxId !== "string" ||
    !review.original.outboxId ||
    typeof review.original.providerMessageId !== "string" ||
    (review.eligible && !review.original.providerMessageId) ||
    typeof review.original.recipient !== "string" ||
    !review.original.recipient ||
    !review.stay ||
    !Array.isArray(review.blocks) ||
    review.blocks.some((block) => typeof block !== "string")
  ) {
    throw new Error("The replacement review is incomplete. Refresh the review before continuing.");
  }
  return review;
}

export default function HotelBounceReplacementPanel({
  inquiryId,
  hotelName,
  disabled = false,
}: {
  inquiryId: string;
  hotelName: string;
  disabled?: boolean;
}) {
  const [review, setReview] = useState<ReplacementReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [validatedFingerprint, setValidatedFingerprint] = useState<string | null>(null);
  const [sendAttempted, setSendAttempted] = useState(false);
  const currentInquiry = useRef(inquiryId);
  const operation = useRef(0);
  const busyRef = useRef(false);
  const attemptedRef = useRef(false);
  const reviewController = useRef<AbortController | null>(null);
  currentInquiry.current = inquiryId;

  useEffect(() => {
    operation.current += 1;
    reviewController.current?.abort();
    busyRef.current = false;
    attemptedRef.current = false;
    setReview(null);
    setBusy(false);
    setNotice("");
    setValidatedFingerprint(null);
    setSendAttempted(false);
    return () => {
      operation.current += 1;
      reviewController.current?.abort();
    };
  }, [inquiryId]);

  const displayedReview = review?.inquiryId === inquiryId ? review : null;
  const canValidate = Boolean(
    displayedReview?.eligible && !displayedReview.replacement && !sendAttempted,
  );
  const canSend = Boolean(
    canValidate &&
      displayedReview?.sendEnabled &&
      validatedFingerprint === displayedReview.fingerprint,
  );

  function isCurrent(token: number, id: string) {
    return operation.current === token && currentInquiry.current === id;
  }

  async function loadReview(showWarning = true, retainedNotice = "") {
    if (busyRef.current || disabled) return;
    if (
      showWarning &&
      !window.confirm(
        `REVIEW ONLY\n\nCheck the bounced email and corrected request for ${hotelName}.\nThis step does not send an email.`,
      )
    ) return;
    const id = inquiryId;
    const token = ++operation.current;
    const controller = new AbortController();
    reviewController.current?.abort();
    reviewController.current = controller;
    busyRef.current = true;
    setBusy(true);
    setReview(null);
    setValidatedFingerprint(null);
    setNotice(`${retainedNotice ? `${retainedNotice}\n` : ""}Checking the original delivery evidence and corrected request...`);
    try {
      const response = await fetch(
        `/api/admin/epoch-ai/hotel-inquiries/${encodeURIComponent(id)}/bounce-replacement`,
        { cache: "no-store", signal: controller.signal },
      );
      const result = await readResult(response);
      if (!response.ok) throw new Error(responseError(result, "Replacement review unavailable."));
      const nextReview = parseReview(result, id);
      if (!isCurrent(token, id)) return;
      setReview(nextReview);
      setNotice(
        retainedNotice || (attemptedRef.current
          ? "A replacement send was requested. Check the recorded result below before taking any further action."
          : nextReview.replacement
            ? "A replacement attempt is already recorded. Its history is preserved below."
            : nextReview.eligible
              ? "Replacement review loaded. Check the full message, then use VALIDATE. No email has been sent by this review."
              : "Review the issues below. If the corrected address is not in this approved message, create a revised draft, then SAVE and APPROVE it."),
      );
    } catch (error) {
      if (isCurrent(token, id) && !controller.signal.aborted) {
        const detail = error instanceof Error ? error.message : "Replacement review could not be loaded.";
        setNotice(`${retainedNotice ? `${retainedNotice}\n` : ""}${detail}`);
      }
    } finally {
      if (isCurrent(token, id)) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }

  async function authorize(mode: "VALIDATE_ONLY" | "SEND") {
    const selected = displayedReview;
    if (busyRef.current || disabled || !selected || attemptedRef.current) return;
    if (!selected.eligible || selected.replacement || selected.cc !== REQUIRED_CC) return;
    if (mode === "SEND" && (!selected.sendEnabled || validatedFingerprint !== selected.fingerprint)) return;

    const details = `Hotel: ${selected.supplierName || hotelName}\nOriginal address: ${selected.original.recipient}\nCorrected To: ${selected.to}\nCC: ${REQUIRED_CC}\nStay: ${selected.stay.checkIn} to ${selected.stay.checkOut}\nRooms: ${selected.stay.rooms}\nSubject: ${selected.subject}`;
    const confirmation = mode === "SEND" ? "SEND" : "VALIDATE";
    const warning = mode === "SEND"
      ? `WARNING - LIVE HOTEL EMAIL\nThis sends one replacement to the corrected address and cannot be recalled.\n\n${details}\n\nReview the complete branded preview. Type SEND to authorize this exact email:`
      : `VALIDATE ONLY - NO EMAIL WILL BE SENT\n\n${details}\n\nType VALIDATE to check this exact replacement request:`;
    if (window.prompt(warning) !== confirmation) return;
    if (
      mode === "SEND" &&
      !window.confirm(
        `FINAL WARNING - EXTERNAL EMAIL\n\nSend this approved replacement to ${selected.to}?\nCC: ${REQUIRED_CC}\nHotel: ${selected.supplierName || hotelName}\nStay: ${selected.stay.checkIn} to ${selected.stay.checkOut}\nRooms: ${selected.stay.rooms}\n\nThe original bounced email stays in history. This action cannot be undone.`,
      )
    ) return;

    const id = inquiryId;
    const token = ++operation.current;
    let sendNotice = "";
    busyRef.current = true;
    setBusy(true);
    setValidatedFingerprint(null);
    if (mode === "SEND") {
      attemptedRef.current = true;
      setSendAttempted(true);
    }
    setNotice(mode === "SEND" ? "Submitting the replacement once..." : "Validating the replacement. No email is being sent...");
    try {
      const response = await fetch(
        `/api/admin/epoch-ai/hotel-inquiries/${encodeURIComponent(id)}/bounce-replacement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            confirmation,
            inquiryId: id,
            to: selected.to,
            cc: REQUIRED_CC,
            subject: selected.subject,
            fingerprint: selected.fingerprint,
            originalOutboxId: selected.original.outboxId,
            originalProviderMessageId: selected.original.providerMessageId,
          }),
        },
      );
      const result = await readResult(response);
      if (!isCurrent(token, id)) return;
      if (!response.ok) throw new Error(responseError(result, "Replacement request was not completed."));
      if (mode === "VALIDATE_ONLY") {
        if (
          result.status !== "VALIDATED_NOT_SENT" ||
          result.sent !== false ||
          result.outboxCreated !== false ||
          result.inquiryId !== id ||
          result.fingerprint !== selected.fingerprint
        ) {
          throw new Error("The validation response was unexpected. Refresh the review before continuing.");
        }
        setValidatedFingerprint(selected.fingerprint);
        setNotice("Validation passed. No email was sent. SEND requires your separate final confirmation.");
      } else {
        sendNotice = result.status === "ACCEPTED"
            ? "The email service accepted the replacement. Delivery to the hotel is not yet confirmed. Use REVIEW to check its recorded status."
            : "A replacement attempt was recorded. Check its result before any further action. Do not send it again.";
        setNotice(sendNotice);
      }
    } catch (error) {
      if (isCurrent(token, id)) {
        const detail = error instanceof Error ? error.message : "The request could not be completed.";
        sendNotice = `${detail} A send may have occurred. Use REVIEW to inspect the recorded result; do not submit another send.`;
        setNotice(
          mode === "SEND"
            ? sendNotice
            : `${detail} Validation does not send email.`,
        );
      }
    } finally {
      if (isCurrent(token, id)) {
        busyRef.current = false;
        setBusy(false);
        // Refresh recorded evidence only. Never automatically repeat a POST.
        if (mode === "SEND") await loadReview(false, sendNotice);
      }
    }
  }

  return (
    <details className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
      <summary className="cursor-pointer font-semibold text-[#001F3F]">Replace bounced email</summary>
      <div className="mt-3 space-y-3">
        <p>
          Use this after correcting the hotel address in Supplier CRM and saving and approving a revised inquiry.
          The original email remains in history. One reviewed replacement is allowed for this hotel stay.
        </p>
        <p className="font-medium">Mandatory CC: {REQUIRED_CC}. REVIEW and VALIDATE do not send email.</p>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => void loadReview()}
          className="rounded border border-indigo-500 bg-white px-3 py-2 font-semibold text-indigo-950 disabled:opacity-40"
        >
          {busy ? "Working..." : "REVIEW"}
        </button>

        {displayedReview ? (
          <div className="space-y-3 rounded border border-slate-300 bg-white p-3">
            <h4 className="font-bold text-[#001F3F]">Replacement for {displayedReview.supplierName || hotelName}</h4>
            <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-[auto_1fr]">
              <dt className="font-semibold">Original address</dt><dd className="break-all">{displayedReview.original.recipient}</dd>
              <dt className="font-semibold">Corrected To</dt><dd className="break-all">{displayedReview.to}</dd>
              <dt className="font-semibold">CC</dt><dd className="break-all">{displayedReview.cc}</dd>
              <dt className="font-semibold">Reply-to</dt><dd className="break-all">{displayedReview.replyTo}</dd>
              <dt className="font-semibold">Destination</dt><dd>{displayedReview.stay.destination}</dd>
              <dt className="font-semibold">Stay</dt><dd>{displayedReview.stay.checkIn} to {displayedReview.stay.checkOut}</dd>
              <dt className="font-semibold">Rooms</dt><dd>{displayedReview.stay.rooms}</dd>
              <dt className="font-semibold">Subject</dt><dd className="break-words">{displayedReview.subject}</dd>
            </dl>

            {displayedReview.bounceEvidence ? (
              <p className="rounded bg-amber-50 p-2 text-amber-950">
                The email service confirms a bounce for {displayedReview.bounceEvidence.recipient}.
                {displayedReview.bounceEvidence.message ? ` ${displayedReview.bounceEvidence.message}` : ""}
              </p>
            ) : null}

            {displayedReview.replacement ? (
              <p
                role="status"
                className={displayedReview.deliveryTracking?.requiresInvestigation ? "font-semibold text-red-800" : "font-semibold text-slate-800"}
              >
                Replacement to {displayedReview.replacement.recipient}: {displayedReview.deliveryTracking?.label || "Attempt recorded; recipient delivery is not confirmed."}
              </p>
            ) : null}

            {displayedReview.blocks.length ? (
              <ul className="list-disc space-y-1 pl-5 text-red-800">
                {displayedReview.blocks.map((block, index) => <li key={index}>{block}</li>)}
              </ul>
            ) : null}

            <p className="font-semibold">Review the complete branded replacement email</p>
            <iframe
              title={`Replacement email preview for ${displayedReview.supplierName || hotelName}`}
              sandbox=""
              referrerPolicy="no-referrer"
              srcDoc={displayedReview.previewHtml}
              className="h-[640px] w-full rounded border border-slate-300 bg-white"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled || busy || !canValidate}
                onClick={() => void authorize("VALIDATE_ONLY")}
                className="rounded border border-teal-600 bg-teal-50 px-3 py-2 font-semibold text-teal-950 disabled:opacity-40"
              >VALIDATE</button>
              <button
                type="button"
                disabled={disabled || busy || !canSend}
                onClick={() => void authorize("SEND")}
                className="rounded border border-red-700 bg-red-50 px-3 py-2 font-semibold text-red-900 disabled:opacity-40"
              >SEND</button>
            </div>
            <p className="text-xs text-slate-700">
              VALIDATE checks this replacement without sending it. SEND contacts the hotel after the final warning and your confirmation.
            </p>
            {!displayedReview.sendEnabled ? <p className="text-amber-800">Supplier sending is unavailable for this review.</p> : null}
          </div>
        ) : null}
        {notice ? <p role="status" aria-live="polite" className="whitespace-pre-wrap font-medium text-slate-800">{notice}</p> : null}
      </div>
    </details>
  );
}
