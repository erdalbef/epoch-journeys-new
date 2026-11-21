import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { CustomRequestStatus } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Props = {
  params: {
    id: string;
  };
};

function formatDate(value: Date | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value: number | null, currency: string) {
  if (value === null || value === undefined) return "-";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function getStatusClasses(status: CustomRequestStatus) {
  switch (status) {
    case CustomRequestStatus.NEW:
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case CustomRequestStatus.IN_REVIEW:
      return "bg-blue-100 text-blue-800 border-blue-200";
    case CustomRequestStatus.QUOTED:
      return "bg-purple-100 text-purple-800 border-purple-200";
    case CustomRequestStatus.CONFIRMED:
      return "bg-green-100 text-green-800 border-green-200";
    case CustomRequestStatus.CANCELLED:
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export default async function Page({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  const { id } = params;

  const request = await db.customTourRequest.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
  });

  if (!request) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#001F3F]">
              Custom Request {request.requestReference}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Review your tailor-made tour request details and current status.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/b2b/custom-requests"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Back to Requests
            </Link>

            <Link
              href="/b2b/custom-requests/new"
              className="rounded-lg bg-[#8B0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6f0000]"
            >
              New Request
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Request Overview
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <div className="text-sm text-slate-500">Reference</div>
                <div className="font-medium text-[#001F3F]">
                  {request.requestReference}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Status</div>
                <div className="mt-1">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                      request.status
                    )}`}
                  >
                    {formatLabel(request.status)}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Request Type</div>
                <div className="font-medium">
                  {formatLabel(request.requestType)}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Main Destination</div>
                <div className="font-medium">{request.destination || "-"}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Working Title</div>
                <div className="font-medium">{request.title || "-"}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Created</div>
                <div className="font-medium">{formatDate(request.createdAt)}</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm text-slate-500">Destinations</div>
              {request.destinations.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {request.destinations.map((destination) => (
                    <span
                      key={destination}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {destination}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-1 font-medium">-</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Travel Timing
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div>
                <div className="text-sm text-slate-500">Start Date</div>
                <div className="font-medium">{formatDate(request.startDate)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">End Date</div>
                <div className="font-medium">{formatDate(request.endDate)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Duration</div>
                <div className="font-medium">
                  {request.durationDays ? `${request.durationDays} days` : "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Passenger & Group Details
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div>
                <div className="text-sm text-slate-500">Estimated Pax</div>
                <div className="font-medium">{request.estimatedPax ?? "-"}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Adults</div>
                <div className="font-medium">{request.adults ?? "-"}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Children</div>
                <div className="font-medium">{request.children ?? "-"}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Group Name</div>
                <div className="font-medium">{request.groupName || "-"}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Group Leader</div>
                <div className="font-medium">
                  {request.groupLeaderName || "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Budget & Preferences
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div>
                <div className="text-sm text-slate-500">Budget per Person</div>
                <div className="font-medium">
                  {formatMoney(request.budgetPerPerson, request.currency)}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">
                  Accommodation Level
                </div>
                <div className="font-medium">
                  {request.accommodationLevel || "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Room Preference</div>
                <div className="font-medium">{request.roomPreference || "-"}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Include Flights</div>
                <div className="font-medium">
                  {request.needsFlights ? "Yes" : "No"}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Land Only</div>
                <div className="font-medium">
                  {request.landOnly ? "Yes" : "No"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Contact Information
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div>
                <div className="text-sm text-slate-500">Contact Name</div>
                <div className="font-medium">{request.customerName || "-"}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Contact Email</div>
                <div className="font-medium">{request.customerEmail || "-"}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Contact Phone</div>
                <div className="font-medium">{request.customerPhone || "-"}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">Notes</h2>

            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              {request.notes || "No notes provided."}
            </div>
          </div>

          {request.adminReply ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-[#001F3F]">
                Admin Reply
              </h2>

              <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                {request.adminReply}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Quick Summary
            </h2>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                <span className="text-slate-500">Reference</span>
                <span className="font-medium text-[#001F3F]">
                  {request.requestReference}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                <span className="text-slate-500">Status</span>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                    request.status
                  )}`}
                >
                  {formatLabel(request.status)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                <span className="text-slate-500">Type</span>
                <span className="font-medium">
                  {formatLabel(request.requestType)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                <span className="text-slate-500">Destination</span>
                <span className="font-medium">{request.destination || "-"}</span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
                <span className="text-slate-500">Estimated Pax</span>
                <span className="font-medium">
                  {request.estimatedPax ?? "-"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Budget</span>
                <span className="font-medium">
                  {formatMoney(request.budgetPerPerson, request.currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Next Step
            </h2>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              {request.status === CustomRequestStatus.NEW && (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    Your request has been submitted successfully and is awaiting
                    review.
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    Our team will review your requirements and prepare the most
                    suitable proposal.
                  </div>
                </>
              )}

              {request.status === CustomRequestStatus.IN_REVIEW && (
                <>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    Your request is currently under review by our team.
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    We are working on routing, pricing, and services for your
                    program.
                  </div>
                </>
              )}

              {request.status === CustomRequestStatus.QUOTED && (
                <>
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                    A proposal or pricing update is now available for your
                    request.
                  </div>
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                    Please review the admin reply and contact us to proceed.
                  </div>
                </>
              )}

              {request.status === CustomRequestStatus.CONFIRMED && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  Your custom request has been confirmed. Our team will proceed
                  with operations.
                </div>
              )}

              {request.status === CustomRequestStatus.CANCELLED && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  This request has been cancelled. You can submit a new request
                  anytime.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">Actions</h2>

            <div className="mt-4 space-y-3">
              <Link
                href="/b2b/custom-requests/new"
                className="block rounded-lg bg-[#8B0000] px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-[#6f0000]"
              >
                Submit Another Request
              </Link>

              <Link
                href="/b2b/custom-requests"
                className="block rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-medium text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
              >
                View All Requests
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}