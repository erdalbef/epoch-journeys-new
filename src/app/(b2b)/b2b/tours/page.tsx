import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

function calculateCommission(
  price: number,
  commissionRate: number | null
) {
  if (!commissionRate || commissionRate <= 0) return 0;
  return price * commissionRate;
}

function calculateNet(
  price: number,
  commissionRate: number | null
) {
  if (!commissionRate || commissionRate <= 0) return price;
  return price - price * commissionRate;
}

export default async function B2BToursPage() {
  const session = await getServerSession(authOptions);

  const agent = await db.user.findUnique({
    where: { id: session?.user?.id },
    select: {
      id: true,
      commissionRate: true,
    },
  });

  if (!agent) return null;

  // 🔥 GET OVERRIDES
  const overrides = await db.agentTourCommission.findMany({
    where: {
      agentId: agent.id,
    },
  });

  const tours = await db.tour.findMany({
    where: {
      isPublished: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      category: true,
      duration: true,
      mainImageUrl: true,
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
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#001F3F]">
          Available Tours
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse all tours and view upcoming departures.
        </p>
      </div>

      {tours.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-center text-gray-500">
          No tours available.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {tours.map((tour) => {
            const firstAvailableDeparture = tour.departureDates.find((d) => {
              const seatsLeft = d.capacity - d.bookedSeats;
              return (
                d.status !== "SOLD_OUT" &&
                d.status !== "CLOSED" &&
                seatsLeft > 0
              );
            });

            if (!firstAvailableDeparture) {
              return (
                <div
                  key={tour.id}
                  className="rounded-2xl border bg-white shadow-sm overflow-hidden"
                >
                  <div className="p-4 text-sm text-gray-400">
                    No available departures
                  </div>
                </div>
              );
            }

            const price = Number(firstAvailableDeparture.price);

            // 🔥 FIND OVERRIDE
            const override = overrides.find(
              (o) => o.tourId === tour.id
            );

            const effectiveCommissionRate =
              override?.commissionRate ?? agent.commissionRate ?? null;

            const commission = calculateCommission(
              price,
              effectiveCommissionRate
            );

            const net = calculateNet(
              price,
              effectiveCommissionRate
            );

            return (
              <div
                key={tour.id}
                className="rounded-2xl border bg-white shadow-sm overflow-hidden"
              >
                {/* IMAGE */}
                <div className="h-48 bg-gray-100 relative">
                  {tour.mainImageUrl ? (
                    <Image
                      src={tour.mainImageUrl}
                      alt={tour.title}
                      fill
                      className="object-cover"
                    />
                  ) : null}
                </div>

                {/* CONTENT */}
                <div className="p-4 space-y-3">
                  <h2 className="font-semibold text-[#001F3F]">
                    {tour.title}
                  </h2>

                  <p className="text-sm text-gray-500">
                    {tour.duration} days · {tour.category}
                  </p>

                  <div className="text-sm space-y-1">
                    <div>
                      {formatDate(firstAvailableDeparture.date)} ·{" "}
                      {getSeasonLabel(firstAvailableDeparture.season)}
                    </div>

                    <div>
                      Status:{" "}
                      <span className="font-medium">
                        {getStatusLabel(firstAvailableDeparture.status)}
                      </span>
                    </div>

                    {/* GROSS */}
                    <div>
                      Gross:{" "}
                      <span className="font-medium">
                        {formatCurrency(price)}
                      </span>
                    </div>

                    {/* COMMISSION */}
                    <div className="text-green-700">
                      Commission:{" "}
                      <span className="font-medium">
                        {formatCurrency(commission)}
                      </span>
                    </div>

                    {/* NET */}
                    <div className="font-semibold text-[#001F3F]">
                      Net: {formatCurrency(net)}
                    </div>

                    {/* 🔥 OVERRIDE BADGE */}
                    {override && (
                      <div className="text-xs text-blue-600">
                        Custom commission applied
                      </div>
                    )}
                  </div>

                  {/* ACTIONS */}
                  <div className="flex gap-2 pt-2">
                    <Link
                      href={`/b2b/tours/${tour.id}`}
                      className="flex-1 rounded border px-3 py-2 text-center text-sm hover:bg-gray-50"
                    >
                      View Tour
                    </Link>

                    {!tour.requiresQuote ? (
                      <Link
                        href={`/b2b/tours/${tour.id}/book?departureId=${firstAvailableDeparture.id}`}
                        className="flex-1 rounded bg-red-700 px-3 py-2 text-center text-sm text-white hover:bg-red-800"
                      >
                        Book Now
                      </Link>
                    ) : (
                      <span className="flex-1 rounded bg-gray-200 px-3 py-2 text-center text-sm text-gray-500">
                        Quote
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}