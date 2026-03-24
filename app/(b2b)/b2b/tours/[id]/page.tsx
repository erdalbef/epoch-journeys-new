// app/b2b/tours/[id]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getSeasonLabel(season: string) {
  switch (season) {
    case "LOW":
      return "Low Season";
    case "SHOULDER":
      return "Shoulder Season";
    case "HIGH":
      return "High Season";
    case "PEAK":
      return "Peak Season";
    default:
      return season;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "EARLY_BOOKING":
      return "Early Booking";
    case "AVAILABLE":
      return "Available";
    case "SOLD_OUT":
      return "Sold Out";
    case "CLOSED":
      return "Closed";
    default:
      return status;
  }
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "EARLY_BOOKING":
      return "bg-blue-100 text-blue-700";
    case "AVAILABLE":
      return "bg-green-100 text-green-700";
    case "SOLD_OUT":
      return "bg-red-100 text-red-700";
    case "CLOSED":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function calculateNetPrice(price: number, commissionRate: number | null) {
  if (!commissionRate || commissionRate <= 0) {
    return price;
  }

  return price - price * commissionRate;
}

export default async function B2BTourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    notFound();
  }

  const agent = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      commissionRate: true,
      fullName: true,
      travelAgency: true,
    },
  });

  if (!agent) {
    notFound();
  }

  const tour = await db.tour.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      category: true,
      duration: true,
      destinations: true,
      shortDescription: true,
      overview: true,
      mainImageUrl: true,
      brochureUrl: true,
      requiresQuote: true,
      departureDates: {
        orderBy: {
          date: "asc",
        },
        select: {
          id: true,
          date: true,
          season: true,
          price: true,
          status: true,
          capacity: true,
          bookedSeats: true,
          earlyDiscountPercent: true,
          earlyDiscountDeadline: true,
        },
      },
    },
  });

  if (!tour) {
    notFound();
  }

  const commissionRate = agent.commissionRate ?? null;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="w-full lg:w-1/3">
            <div className="overflow-hidden rounded-2xl border bg-gray-100">
              {tour.mainImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tour.mainImageUrl}
                  alt={tour.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No image available
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                {tour.category}
              </span>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {tour.duration} days
              </span>

              {tour.requiresQuote ? (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  Quote Required
                </span>
              ) : null}
            </div>

            <div>
              <h1 className="text-3xl font-bold text-[#001F3F]">{tour.title}</h1>

              {tour.destinations.length > 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {tour.destinations.join(" • ")}
                </p>
              ) : null}
            </div>

            {tour.shortDescription ? (
              <p className="text-sm leading-6 text-gray-700">
                {tour.shortDescription}
              </p>
            ) : null}

            {tour.overview ? (
              <div>
                <h2 className="text-lg font-semibold text-[#001F3F]">Overview</h2>
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {tour.overview}
                </p>
              </div>
            ) : null}

            <div className="rounded-xl bg-gray-50 p-4 text-sm">
              <div className="font-medium text-[#001F3F]">Agent Pricing</div>
              <div className="mt-2 text-gray-700">
                Commission Rate:{" "}
                <span className="font-medium">
                  {commissionRate !== null ? `${commissionRate * 100}%` : "0%"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Net price is shown after your commission is deducted.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/b2b/tours"
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
              >
                Back to Tours
              </Link>

              {tour.brochureUrl ? (
                <a
                  href={tour.brochureUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
                >
                  Brochure
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Departure Dates & Pricing
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review all departures, gross selling price, and your net price.
          </p>
        </div>

        {tour.departureDates.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-4 text-sm text-muted-foreground">
            No departure dates available yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-225 text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3 font-medium text-[#001F3F]">Date</th>
                  <th className="p-3 font-medium text-[#001F3F]">Season</th>
                  <th className="p-3 font-medium text-[#001F3F]">Status</th>
                  <th className="p-3 font-medium text-[#001F3F]">Gross Price</th>
                  <th className="p-3 font-medium text-[#001F3F]">Your Net</th>
                  <th className="p-3 font-medium text-[#001F3F]">Seats</th>
                  <th className="p-3 font-medium text-[#001F3F]">Action</th>
                </tr>
              </thead>

              <tbody>
                {tour.departureDates.map((departure) => {
                  const seatsLeft = Math.max(
                    departure.capacity - departure.bookedSeats,
                    0
                  );

                  const netPrice = calculateNetPrice(
                    Number(departure.price),
                    commissionRate
                  );

                  const canBook =
                    !tour.requiresQuote &&
                    departure.status !== "SOLD_OUT" &&
                    departure.status !== "CLOSED" &&
                    seatsLeft > 0;

                  return (
                    <tr key={departure.id} className="border-b align-top">
                      <td className="p-3">{formatDate(departure.date)}</td>

                      <td className="p-3">{getSeasonLabel(departure.season)}</td>

                      <td className="p-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                            departure.status
                          )}`}
                        >
                          {getStatusLabel(departure.status)}
                        </span>

                        {departure.status === "EARLY_BOOKING" &&
                        departure.earlyDiscountPercent ? (
                          <div className="mt-2 text-xs text-blue-700">
                            {departure.earlyDiscountPercent}% early booking
                            {departure.earlyDiscountDeadline
                              ? ` until ${formatDate(
                                  departure.earlyDiscountDeadline
                                )}`
                              : ""}
                          </div>
                        ) : null}
                      </td>

                      <td className="p-3 font-medium">
                        {formatCurrency(Number(departure.price))}
                      </td>

                      <td className="p-3 font-semibold text-green-700">
                        {formatCurrency(netPrice)}
                      </td>

                      <td className="p-3">
                        <div>
                          {departure.bookedSeats} / {departure.capacity} booked
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {seatsLeft} left
                        </div>
                      </td>

                      <td className="p-3">
                        {canBook ? (
                          <Link
                            href={`/b2b/tours/${tour.id}/book?departureId=${departure.id}`}
                            className="inline-flex rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
                          >
                            Book Now
                          </Link>
                        ) : (
                          <span className="inline-flex rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500">
                            {tour.requiresQuote
                              ? "Request Quote"
                              : departure.status === "SOLD_OUT"
                                ? "Sold Out"
                                : departure.status === "CLOSED"
                                  ? "Closed"
                                  : "Not Available"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}