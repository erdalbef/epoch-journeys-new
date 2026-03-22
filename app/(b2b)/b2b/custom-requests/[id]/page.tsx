import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{
    id: string;
  }>;
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

export default async function Page({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  const { id } = await params;

  const request = await db.customTourRequest.findUnique({
    where: {
      id,
    },
  });

  if (!request || request.userId !== session.user.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#001F3F]">
              Custom Request {request.requestReference}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Review your tailor-made tour request details and current status.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/b2b/custom-requests"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
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

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Request Overview
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Reference</div>
                <div className="font-medium text-[#001F3F]">
                  {request.requestReference}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="font-medium">{formatLabel(request.status)}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">
                  Request Type
                </div>
                <div className="font-medium">
                  {formatLabel(request.requestType)}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">
                  Main Destination
                </div>
                <div className="font-medium">{request.destination || "-"}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">
                  Working Title
                </div>
                <div className="font-medium">{request.title || "-"}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="font-medium">{formatDate(request.createdAt)}</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm text-muted-foreground">Destinations</div>
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
                <div className="font-medium">-</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Travel Timing
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">Start Date</div>
                <div className="font-medium">{formatDate(request.startDate)}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">End Date</div>
                <div className="font-medium">{formatDate(request.endDate)}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Duration</div>
                <div className="font-medium">
                  {request.durationDays ? `${request.durationDays} days` : "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Passenger & Group Details
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">Estimated Pax</div>
                <div className="font-medium">{request.estimatedPax ?? "-"}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Adults</div>
                <div className="font-medium">{request.adults ?? "-"}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Children</div>
                <div className="font-medium">{request.children ?? "-"}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Group Name</div>
                <div className="font-medium">{request.groupName || "-"}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Group Leader</div>
                <div className="font-medium">
                  {request.groupLeaderName || "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Budget & Preferences
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">
                  Budget per Person
                </div>
                <div className="font-medium">
                  {formatMoney(request.budgetPerPerson, request.currency)}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">
                  Accommodation Level
                </div>
                <div className="font-medium">
                  {request.accommodationLevel || "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">
                  Room Preference
                </div>
                <div className="font-medium">{request.roomPreference || "-"}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">
                  Include Flights
                </div>
                <div className="font-medium">
                  {request.needsFlights ? "Yes" : "No"}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Land Only</div>
                <div className="font-medium">
                  {request.landOnly ? "Yes" : "No"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Contact Information
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">Contact Name</div>
                <div className="font-medium">{request.customerName || "-"}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Contact Email</div>
                <div className="font-medium">{request.customerEmail || "-"}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Contact Phone</div>
                <div className="font-medium">{request.customerPhone || "-"}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">Notes</h2>

            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              {request.notes || "No notes provided."}
            </div>
          </div>

          {request.adminReply ? (
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
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
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Quick Summary
            </h2>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-medium text-[#001F3F]">
                  {request.requestReference}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{formatLabel(request.status)}</span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">
                  {formatLabel(request.requestType)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Destination</span>
                <span className="font-medium">{request.destination || "-"}</span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b pb-3">
                <span className="text-muted-foreground">Estimated Pax</span>
                <span className="font-medium">
                  {request.estimatedPax ?? "-"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Budget</span>
                <span className="font-medium">
                  {formatMoney(request.budgetPerPerson, request.currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Next Step
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border bg-slate-50 p-4">
                Your request has been submitted successfully and is awaiting review.
              </div>

              <div className="rounded-xl border bg-slate-50 p-4">
                Our team will review your requirements and prepare the most suitable proposal.
              </div>

              <div className="rounded-xl border bg-slate-50 p-4">
                Once reviewed, the updated status and any admin reply will appear on this page.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}