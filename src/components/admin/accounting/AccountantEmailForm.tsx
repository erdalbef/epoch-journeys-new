"use client";

import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  TriangleAlert,
} from "lucide-react";

type Props = {
  year: number;
  month: number;
  part1Count: number;
  part2Count: number;
};

function getMonthName(
  month: number
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      month: "long",
    }
  ).format(
    new Date(
      Date.UTC(
        2026,
        month - 1,
        1
      )
    )
  );
}

function getSendStamp() {
  const now = new Date();

  const datePart =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ).format(now);

  const timePart =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    ).format(now);

  return `${datePart} ${timePart}`;
}

export default function AccountantEmailForm({
  year,
  month,
  part1Count,
  part2Count,
}: Props) {
  const router =
    useRouter();

  const monthLabel =
    getMonthName(month);

  const [emails, setEmails] =
    useState([
      "",
      "",
      "",
      "",
    ]);

  const [
    subject,
    setSubject,
  ] = useState(
    `Epoch Journeys OOD – Accounting Documents – ${monthLabel} ${year} – ${getSendStamp()}`
  );

  const [
    message,
    setMessage,
  ] = useState(
    `Dear Sir/Madam,

Please find attached the accounting documents for ${monthLabel} ${year}.

The documents are organized into two ZIP packages according to the monthly accounting documentation structure.

Kind regards,
Epoch Journeys OOD`
  );

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    success,
    setSuccess,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  function updateEmail(
    index: number,
    value: string
  ) {
    setEmails(
      (current) =>
        current.map(
          (
            email,
            emailIndex
          ) =>
            emailIndex ===
            index
              ? value
              : email
        )
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSuccess(null);
    setError(null);

    const recipients =
      emails
        .map((email) =>
          email.trim()
        )
        .filter(Boolean);

    if (
      recipients.length === 0
    ) {
      setError(
        "Please enter at least one recipient email address."
      );

      return;
    }

    if (!subject.trim()) {
      setError(
        "Please enter an email subject."
      );

      return;
    }

    if (!message.trim()) {
      setError(
        "Please enter an email message."
      );

      return;
    }

    setSending(true);

    try {
      const response =
        await fetch(
          "/api/admin/accounting/email-package",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                year,
                month,
                recipients,
                subject:
                  subject.trim(),
                message:
                  message.trim(),
              }),
          }
        );

      const data =
        (await response.json()) as {
          ok?: boolean;
          error?: string;
          message?: string;
          recipientCount?: number;
          attachmentCount?: number;
        };

      if (
        !response.ok ||
        !data.ok
      ) {
        throw new Error(
          data.error ??
            "Unable to send accounting package."
        );
      }

      setSuccess(
        data.message ??
          "Accounting package sent successfully."
      );

      router.refresh();
    } catch (
      sendError
    ) {
      setError(
        sendError instanceof
        Error
          ? sendError.message
          : "Unable to send accounting package."
      );
    } finally {
      setSending(
        false
      );
    }
  }

  const noDocuments =
    part1Count === 0 &&
    part2Count === 0;

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="border-t bg-white px-6 py-6"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[#0B1F3A] p-2.5 text-white">
          <Mail className="h-5 w-5" />
        </div>

        <div>
          <h3 className="font-semibold text-[#0B1F3A]">
            Email Accountant
          </h3>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            Send the current monthly accounting package
            directly to up to four recipients.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Package to be sent
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-3">
            <p className="text-sm font-semibold text-slate-800">
              ZIP Part 1
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Categories 01–04
            </p>

            <p className="mt-2 text-sm font-medium text-slate-700">
              {part1Count}{" "}
              {part1Count === 1
                ? "document"
                : "documents"}
            </p>
          </div>

          <div className="rounded-lg bg-white p-3">
            <p className="text-sm font-semibold text-slate-800">
              ZIP Part 2
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Categories 05–08
            </p>

            <p className="mt-2 text-sm font-medium text-slate-700">
              {part2Count}{" "}
              {part2Count === 1
                ? "document"
                : "documents"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {emails.map(
          (
            email,
            index
          ) => (
            <div
              key={index}
            >
              <label
                htmlFor={`accountant-email-${index}`}
                className="mb-1.5 block text-sm font-semibold text-slate-700"
              >
                Email{" "}
                {index + 1}
                {index === 0
                  ? " *"
                  : ""}
              </label>

              <input
                id={`accountant-email-${index}`}
                type="email"
                value={email}
                onChange={(
                  event
                ) =>
                  updateEmail(
                    index,
                    event
                      .target
                      .value
                  )
                }
                placeholder={
                  index === 0
                    ? "accountant@example.com"
                    : "Optional"
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-2 focus:ring-red-100"
              />
            </div>
          )
        )}
      </div>

      <div className="mt-5">
        <label
          htmlFor="accounting-email-subject"
          className="mb-1.5 block text-sm font-semibold text-slate-700"
        >
          Subject
        </label>

        <input
          id="accounting-email-subject"
          type="text"
          value={
            subject
          }
          onChange={(
            event
          ) =>
            setSubject(
              event.target
                .value
            )
          }
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-2 focus:ring-red-100"
        />

        <p className="mt-1 text-xs text-slate-500">
          The default subject includes the send date and time
          so repeated test emails are easier to distinguish.
        </p>
      </div>

      <div className="mt-5">
        <label
          htmlFor="accounting-email-message"
          className="mb-1.5 block text-sm font-semibold text-slate-700"
        >
          Message
        </label>

        <textarea
          id="accounting-email-message"
          value={
            message
          }
          onChange={(
            event
          ) =>
            setMessage(
              event.target
                .value
            )
          }
          rows={8}
          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-[#8B0000] focus:ring-2 focus:ring-red-100"
        />
      </div>

      <div className="mt-5 rounded-xl border bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Attachments
        </p>

        <div className="mt-3 space-y-2 text-sm">
          {part1Count >
            0 && (
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />

              <span>
                ZIP Part 1 —
                Categories 01–04 (
                {part1Count}{" "}
                {part1Count === 1
                  ? "document"
                  : "documents"}
                )
              </span>
            </div>
          )}

          {part2Count >
            0 && (
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />

              <span>
                ZIP Part 2 —
                Categories 05–08 (
                {part2Count}{" "}
                {part2Count === 1
                  ? "document"
                  : "documents"}
                )
              </span>
            </div>
          )}

          {noDocuments && (
            <p className="text-slate-500">
              No accounting documents are available to send.
            </p>
          )}
        </div>
      </div>

      {success && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

          <p className="text-sm font-medium text-emerald-800">
            {success}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />

          <p className="text-sm font-medium text-red-800">
            {error}
          </p>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={
            sending ||
            noDocuments
          }
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8B0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Accounting Package
            </>
          )}
        </button>
      </div>
    </form>
  );
}