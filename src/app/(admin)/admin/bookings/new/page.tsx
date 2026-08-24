import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type Props = {
  searchParams: Promise<{
    requestId?: string;
  }>;
};

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AdminNewBookingPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const resolvedSearchParams = await searchParams;
  const requestId = resolvedSearchParams.requestId;

  const sourceRequest = requestId
    ? await db.customTourRequest.findUnique({
        where: { id: requestId },
        include: {
          user: true,
        },
      })
    : null;

  const [tours, agents] = await Promise.all([
    db.tour.findMany({
      where: {
        isPublished: true,
      },
      orderBy: {
        title: "asc",
      },
      include: {
        departureDates: {
          orderBy: {
            date: "asc",
          },
        },
      },
    }),
    db.user.findMany({
      where: {
        role: Role.AGENT,
        approved: true,
        status: "ACTIVE",
      },
      orderBy: [
        {
          travelAgency: "asc",
        },
        {
          fullName: "asc",
        },
      ],
      select: {
        id: true,
        fullName: true,
        email: true,
        travelAgency: true,
        agentCode: true,
        partnerType: true,
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#001F3F]">
          {sourceRequest ? "Convert Request to Booking" : "Create Booking"}
        </h1>

        <p className="mt-1 text-sm text-slate-600">
          {sourceRequest
            ? `Create a booking from request ${sourceRequest.requestReference}.`
            : "Create a booking manually for an approved Epoch partner."}
        </p>
      </div>

      {sourceRequest ? (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#001F3F]">
            Source Request Summary
          </h2>

          <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <div>
              <div className="text-slate-500">Reference</div>
              <div className="font-medium">
                {sourceRequest.requestReference}
              </div>
            </div>

            <div>
              <div className="text-slate-500">Agent</div>
              <div className="font-medium">
                {sourceRequest.user?.fullName || "-"}
              </div>
            </div>

            <div>
              <div className="text-slate-500">Destination</div>
              <div className="font-medium">
                {sourceRequest.destination || "-"}
              </div>
            </div>

            <div>
              <div className="text-slate-500">Estimated Pax</div>
              <div className="font-medium">
                {sourceRequest.estimatedPax ?? "-"}
              </div>
            </div>

            <div>
              <div className="text-slate-500">Travel Dates</div>
              <div className="font-medium">
                {sourceRequest.startDate
                  ? formatDate(sourceRequest.startDate)
                  : "-"}{" "}
                {sourceRequest.endDate
                  ? `- ${formatDate(sourceRequest.endDate)}`
                  : ""}
              </div>
            </div>

            <div>
              <div className="text-slate-500">Budget Per Person</div>
              <div className="font-medium">
                {sourceRequest.budgetPerPerson
                  ? formatMoney(
                      sourceRequest.budgetPerPerson,
                      sourceRequest.currency || "EUR",
                    )
                  : "-"}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <form
        action="/api/admin/bookings/convert-from-request"
        method="POST"
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {sourceRequest ? (
          <input type="hidden" name="requestId" value={sourceRequest.id} />
        ) : null}

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          <strong>Booking type:</strong> choose <strong>Private Group</strong> when
          the partner is organizing its own group on requested dates, or{" "}
          <strong>Epoch Scheduled Departure</strong> when travelers are joining a
          published Epoch departure.
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Agent / Partner *
            </label>

            {sourceRequest ? (
              <>
                <input type="hidden" name="userId" value={sourceRequest.userId} />
                <div className="rounded-xl border bg-slate-50 px-4 py-3 text-sm">
                  <div className="font-medium text-[#001F3F]">
                    {sourceRequest.user?.travelAgency ||
                      sourceRequest.user?.fullName ||
                      sourceRequest.user?.email}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {sourceRequest.user?.email}
                  </div>
                </div>
              </>
            ) : (
              <select
                name="userId"
                required
                defaultValue=""
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              >
                <option value="" disabled>
                  Select an approved partner
                </option>

                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.travelAgency || agent.fullName || agent.email}
                    {agent.agentCode ? ` — ${agent.agentCode}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Booking Type *
            </label>

            <select
              name="bookingMode"
              required
              defaultValue={
                sourceRequest?.bookingType === "FIT"
                  ? "SCHEDULED"
                  : "PRIVATE_GROUP"
              }
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            >
              <option value="PRIVATE_GROUP">Private Group</option>
              <option value="SCHEDULED">Epoch Scheduled Departure</option>
            </select>

            <p className="mt-1 text-xs text-slate-500">
              Private Group does not require an existing departure record.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Tour *
            </label>

            <select
              name="tourId"
              required
              defaultValue={sourceRequest?.tourId || ""}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            >
              <option value="" disabled>
                Select a tour
              </option>

              {tours.map((tour) => (
                <option key={tour.id} value={tour.id}>
                  {tour.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Published Departure
            </label>

            <select
              name="departureDateId"
              defaultValue=""
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            >
              <option value="">
                None — requested/private group dates
              </option>

              {tours.flatMap((tour) =>
                tour.departureDates.map((departure) => (
                  <option key={departure.id} value={departure.id}>
                    {tour.title} — {formatDate(departure.date)} —{" "}
                    {formatMoney(departure.price, tour.currency)} —{" "}
                    {departure.status}
                  </option>
                )),
              )}
            </select>

            <p className="mt-1 text-xs text-slate-500">
              Required only for an Epoch Scheduled Departure.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Travel Start Date
            </label>
            <input
              type="date"
              name="travelStartDate"
              defaultValue={
                sourceRequest?.startDate
                  ? sourceRequest.startDate.toISOString().slice(0, 10)
                  : ""
              }
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Travel End Date
            </label>
            <input
              type="date"
              name="travelEndDate"
              defaultValue={
                sourceRequest?.endDate
                  ? sourceRequest.endDate.toISOString().slice(0, 10)
                  : ""
              }
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Customer Name
            </label>
            <input
              name="customerName"
              defaultValue={sourceRequest?.customerName || ""}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Customer Email
            </label>
            <input
              name="customerEmail"
              type="email"
              defaultValue={
                sourceRequest?.customerEmail || sourceRequest?.user?.email || ""
              }
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Customer Phone
            </label>
            <input
              name="customerPhone"
              defaultValue={sourceRequest?.customerPhone || ""}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Number of Guests *
            </label>
            <input
              type="number"
              min={1}
              name="numberOfGuests"
              defaultValue={sourceRequest?.estimatedPax ?? 1}
              required
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Adults
            </label>
            <input
              type="number"
              min={0}
              name="adults"
              defaultValue={
                sourceRequest?.adults ?? sourceRequest?.estimatedPax ?? 1
              }
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Children
            </label>
            <input
              type="number"
              min={0}
              name="children"
              defaultValue={sourceRequest?.children ?? 0}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Currency *
            </label>
            <select
              name="currency"
              defaultValue={sourceRequest?.currency || "EUR"}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Total Booking Price
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              name="totalPrice"
              defaultValue={sourceRequest?.totalBudget ?? ""}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
              placeholder="Required for Private Group"
            />
            <p className="mt-1 text-xs text-slate-500">
              For a scheduled departure, leave blank to calculate from the
              departure price × guests.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Group Name
            </label>
            <input
              name="groupName"
              defaultValue={sourceRequest?.groupName || ""}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Group Leader Name
            </label>
            <input
              name="groupLeaderName"
              defaultValue={sourceRequest?.groupLeaderName || ""}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Internal Notes
          </label>
          <textarea
            name="internalNotes"
            rows={7}
            defaultValue={
              sourceRequest
                ? [
                    `Source Request Reference: ${sourceRequest.requestReference}`,
                    sourceRequest.notes
                      ? `Request Notes:\n${sourceRequest.notes}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join("\n\n")
                : ""
            }
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#8B0000]"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-[#8B0000] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#6f0000]"
          >
            Create Booking
          </button>

          <Link
            href={sourceRequest ? "/admin/custom-requests" : "/admin/bookings"}
            className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
