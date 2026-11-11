"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Delivery = {
  id: string;
  eventKey: string;
  recipient: string;
  subject: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  lastAttemptAt: string | null;
  acceptedAt: string | null;
  leaseExpiresAt: string | null;
};

type ResponseData = {
  records: Delivery[];
  counts: Record<string, number>;
};

const statuses = [
  "PENDING",
  "SENDING",
  "ACCEPTED",
  "FAILED",
  "UNCERTAIN"
];

export default function EmailDeliveryPage() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/email-delivery",
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Unable to load email delivery records");
      }

      setData(await response.json());
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function displayDate(value: string | null) {
    return value
      ? new Date(value).toLocaleString("en-GB")
      : "-";
  }

  function displayStatus(record: Delivery) {
    if (
      record.status === "SENDING" &&
      record.leaseExpiresAt &&
      new Date(record.leaseExpiresAt).getTime() < Date.now()
    ) {
      return "SENDING - EXPIRED";
    }

    return record.status;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/notifications"
          className="text-sm text-blue-700 underline"
        >
          Back to Admin Notifications
        </Link>

        <h1 className="mt-3 text-3xl font-bold">
          Email Delivery Monitor
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Monitor queued, accepted, failed, and uncertain
          notification emails. Provider acceptance does not
          guarantee delivery to the recipient.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void load()}
        disabled={loading}
        className="rounded bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {loading ? "Loading..." : "Refresh"}
      </button>

      {error && <p className="text-red-700">{error}</p>}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {statuses.map(status => (
              <div
                key={status}
                className="rounded-lg border bg-white p-4"
              >
                <div className="text-xs font-semibold text-slate-500">
                  {status}
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {data.counts[status] || 0}
                </div>
              </div>
            ))}
          </div>

          {(data.counts.FAILED || 0) +
            (data.counts.UNCERTAIN || 0) > 0 && (
            <p
              role="alert"
              className="rounded border border-amber-300 bg-amber-50 p-4 text-sm"
            >
              Some emails need investigation. Do not resend
              uncertain messages without verifying their
              delivery status.
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3">Created</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Attempts</th>
                </tr>
              </thead>

              <tbody>
                {data.records.map(record => (
                  <tr key={record.id} className="border-t">
                    <td className="p-3 whitespace-nowrap">
                      {displayDate(record.createdAt)}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">
                        {record.subject}
                      </div>
                      {record.lastError && (
                        <div className="mt-1 text-xs text-red-700">
                          {record.lastError}
                        </div>
                      )}
                    </td>
                    <td className="p-3">{record.recipient}</td>
                    <td className="p-3 font-medium">
                      {displayStatus(record)}
                    </td>
                    <td className="p-3">{record.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.records.length === 0 && (
              <p className="p-5 text-sm text-slate-500">
                No email notifications recorded.
              </p>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Showing the 100 most recent records.
            Status totals include all records.
            Email sending and retry controls are not enabled here.
          </p>
        </>
      )}
    </div>
  );
}
