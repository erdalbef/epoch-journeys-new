import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
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

function calculateCommission(price: number, commissionRate: number | null) {
  if (!commissionRate || commissionRate <= 0) return 0;
  return price * (commissionRate / 100);
}

function calculateNet(price: number, commissionRate: number | null) {
  if (!commissionRate || commissionRate <= 0) return price;
  return price - price * (commissionRate / 100);
}

export default async function TourDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    notFound();
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      commissionRate: true,
      partnerType: true,
    },
  });

  const commissionRate = user?.commissionRate ?? null;
  const isGroupLeader = user?.partnerType === "GROUP_LEADER";
  const earningsLabel = isGroupLeader ? "Payout" : "Commission";

  const tour = await db.tour.findUnique({
    where: { id: params.id },
    include: {
      departureDates: {
        orderBy: {
          date: "asc",
        },
      },
    },
  });

  if (!tour) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#001F3F]">{tour.title}</h1>

        <p className="mt-2 text-muted-foreground">
          {tour.duration} days · {tour.category}
        </p>
      </div>

      {tour.overview && (
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="mb-2 text-lg font-semibold text-[#001F3F]">
            Overview
          </h2>
          <p className="text-sm text-gray-600">{tour.overview}</p>
        </div>
      )}

      <div className="rounded-2xl border bg-white p-6">
        <h2 className="mb-4 text-xl font-semibold text-[#001F3F]">
          Available Departures
        </h2>

        <div className="space-y-4">
          {tour.departureDates.map((dep) => {
            const price = Number(dep.price);
            const commission = calculateCommission(price, commissionRate);
            const net = calculateNet(price, commissionRate);
            const seatsLeft = dep.capacity - dep.bookedSeats;

            return (
              <div key={dep.id} className="space-y-3 rounded-xl border p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="font-medium text-[#001F3F]">
                    {formatDate(dep.date)} · {getSeasonLabel(dep.season)}
                  </div>

                  <div className="text-sm">
                    Status:{" "}
                    <span className="font-medium">
                      {getStatusLabel(dep.status)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                  <div>
                    <div className="text-muted-foreground">Gross</div>
                    <div className="font-medium">{formatCurrency(price)}</div>
                  </div>

                  <div>
                    <div className="text-muted-foreground">{earningsLabel}</div>
                    <div className="font-medium text-green-700">
                      {formatCurrency(commission)}
                    </div>
                  </div>

                  <div>
                    <div className="text-muted-foreground">Net</div>
                    <div className="font-semibold text-[#001F3F]">
                      {formatCurrency(net)}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Seats left: {Math.max(seatsLeft, 0)} / {dep.capacity}
                </div>

                <div className="pt-2">
                  {dep.status === "AVAILABLE" && seatsLeft > 0 ? (
                    <a
                      href={`/b2b/tours/${tour.id}/book?departureId=${dep.id}`}
                      className="inline-block rounded-lg bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-800"
                    >
                      Book This Departure
                    </a>
                  ) : (
                    <span className="inline-block rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-500">
                      Not Available
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}