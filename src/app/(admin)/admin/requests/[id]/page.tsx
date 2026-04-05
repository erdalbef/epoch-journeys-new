import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value: Date | string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatText(value: string | null | undefined) {
  if (!value || value.trim() === "") return "—";
  return value;
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value.toString();
}

function formatCurrency(
  value: number | null | undefined,
  currency: string | null | undefined = "EUR"
) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBoolean(value: boolean | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value ? "Yes" : "No";
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function getStatusClasses(status: string) {
  switch (status) {
    case "NEW":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "IN_REVIEW":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "QUOTED":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "CONFIRMED":
      return "bg-green-100 text-green-800 border-green-200";
    case "CANCELLED":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getRequestTypeLabel(type: string) {
  return type.replaceAll("_", " ");
}

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin-login");
  }

  const { id } = await params;

  const request = await db.customTourRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          travelAgency: true,
          partnerType: true,
        },
      },
      requestNotes: {
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!request) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-gray-500">Admin / Requests / Detail</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            Custom Request Detail
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Review request information, client needs, and internal notes.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/requests"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Requests
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Status</p>
          <div className="mt-3">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getStatusClasses(
                request.status
              )}`}
            >
              {formatStatus(request.status)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Request Type</p>
          <p className="mt-3 text-sm font-semibold text-gray-900">
            {getRequestTypeLabel(request.requestType)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Created</p>
          <p className="mt-3 text-sm font-semibold text-gray-900">
            {formatDateTime(request.createdAt)}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Updated</p>
          <p className="mt-3 text-sm font-semibold text-gray-900">
            {formatDateTime(request.updatedAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Request Overview
              </h2>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Request Reference
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatText(request.requestReference)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Title
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatText(request.title)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Main Destination
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatText(request.destination)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Destinations
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {request.destinations.length > 0
                    ? request.destinations.join(", ")
                    : "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Start Date
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDateOnly(request.startDate)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  End Date
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDateOnly(request.endDate)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Duration
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {request.durationDays ? `${request.durationDays} days` : "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Estimated Pax
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatNumber(request.estimatedPax)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Adults
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatNumber(request.adults)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Children
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatNumber(request.children)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Accommodation Level
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatText(request.accommodationLevel)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Room Preference
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatText(request.roomPreference)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Budget Per Person
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatCurrency(request.budgetPerPerson, request.currency)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Currency
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatText(request.currency)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Needs Flights
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatBoolean(request.needsFlights)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Land Only
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatBoolean(request.landOnly)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Customer & Group Information
              </h2>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Customer Name
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatText(request.customerName)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Customer Email
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatText(request.customerEmail)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Customer Phone
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatText(request.customerPhone)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Group Name
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatText(request.groupName)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Group Leader Name
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatText(request.groupLeaderName)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Agent Information
              </h2>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Agent Name
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {request.user?.fullName || request.user?.email || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Agent Email
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatText(request.user?.email)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Agent Phone
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatText(request.user?.phone)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Travel Agency
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {formatText(request.user?.travelAgency)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Partner Type
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {request.user?.partnerType
                    ? request.user.partnerType.replaceAll("_", " ")
                    : "—"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Notes
              </h2>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Request Notes
                </p>
                <p className="mt-2 whitespace-pre-line rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-900">
                  {formatText(request.notes)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Internal Notes
                </p>
                <p className="mt-2 whitespace-pre-line rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-900">
                  {formatText(request.internalNotes)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Admin Reply
                </p>
                <p className="mt-2 whitespace-pre-line rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-900">
                  {formatText(request.adminReply)}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Quick Summary
              </h2>
            </div>

            <div className="space-y-4 p-6 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-gray-500">Request ID</span>
                <span className="break-all text-right font-medium text-gray-900">
                  {request.id}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-gray-500">Reference</span>
                <span className="text-right font-medium text-gray-900">
                  {formatText(request.requestReference)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-gray-500">Status</span>
                <span className="text-right font-medium text-gray-900">
                  {formatStatus(request.status)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-gray-500">Type</span>
                <span className="text-right font-medium text-gray-900">
                  {getRequestTypeLabel(request.requestType)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-gray-500">Destination</span>
                <span className="text-right font-medium text-gray-900">
                  {formatText(request.destination)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-gray-500">Dates</span>
                <span className="text-right font-medium text-gray-900">
                  {formatDateOnly(request.startDate)}{" "}
                  {request.endDate ? `→ ${formatDateOnly(request.endDate)}` : ""}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-gray-500">Estimated Pax</span>
                <span className="text-right font-medium text-gray-900">
                  {formatNumber(request.estimatedPax)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-gray-500">Budget</span>
                <span className="text-right font-medium text-gray-900">
                  {formatCurrency(request.budgetPerPerson, request.currency)}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Internal Timeline
              </h2>
            </div>

            <div className="p-6">
              {request.requestNotes.length === 0 ? (
                <p className="text-sm text-gray-500">No internal notes yet.</p>
              ) : (
                <div className="space-y-4">
                  {request.requestNotes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {note.author.fullName || note.author.email || "Admin"}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(note.createdAt)}
                        </span>
                      </div>

                      <p className="whitespace-pre-line text-sm leading-6 text-gray-700">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}