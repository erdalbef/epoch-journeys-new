import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  MapPin,
  Search,
  Users,
} from "lucide-react";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

type ToursPageProps = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    availability?: string;
  }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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
      return season.replaceAll("_", " ");
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
      return status.replaceAll("_", " ");
  }
}

function calculateCommission(
  price: number,
  commissionRate: number | null,
) {
  if (!commissionRate || commissionRate <= 0) {
    return 0;
  }

  return price * commissionRate;
}

function calculateNet(
  price: number,
  commissionRate: number | null,
) {
  if (!commissionRate || commissionRate <= 0) {
    return price;
  }

  return price - price * commissionRate;
}

function getAvailabilityTone(status: string, seatsLeft: number) {
  if (status === "SOLD_OUT" || status === "CLOSED" || seatsLeft <= 0) {
    return "bg-red-50 text-red-700";
  }

  if (seatsLeft <= 5) {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "EARLY_BOOKING") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-emerald-50 text-emerald-700";
}

export default async function B2BToursPage({
  searchParams,
}: ToursPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  const agent = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      role: true,
      approved: true,
      status: true,
      commissionRate: true,
      partnerType: true,
    },
  });

  if (
    !agent ||
    agent.role !== "AGENT" ||
    !agent.approved ||
    agent.status !== "ACTIVE"
  ) {
    redirect("/agent-login");
  }

  const params = (await searchParams) ?? {};
  const q = params.q?.trim() ?? "";
  const categoryFilter = params.category?.trim() ?? "";
  const availabilityFilter = params.availability?.trim() ?? "available";

  const [overrides, tours] = await Promise.all([
    db.agentTourCommission.findMany({
      where: {
        agentId: agent.id,
      },
    }),

    db.tour.findMany({
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
        destinations: true,
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
    }),
  ]);

  const categories = Array.from(
    new Set(
      tours
        .map((tour) => tour.category)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const filteredTours = tours.filter((tour) => {
    const matchesSearch =
      !q ||
      tour.title.toLowerCase().includes(q.toLowerCase()) ||
      tour.category?.toLowerCase().includes(q.toLowerCase()) ||
      tour.destinations.some((destination) =>
        destination.toLowerCase().includes(q.toLowerCase()),
      );

    const matchesCategory =
      !categoryFilter || tour.category === categoryFilter;

    const hasAvailableDeparture = tour.departureDates.some((departure) => {
      const seatsLeft = departure.capacity - departure.bookedSeats;

      return (
        departure.status !== "SOLD_OUT" &&
        departure.status !== "CLOSED" &&
        seatsLeft > 0
      );
    });

    const matchesAvailability =
      availabilityFilter === "all" || hasAvailableDeparture;

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const availableTourCount = tours.filter((tour) =>
    tour.departureDates.some((departure) => {
      const seatsLeft = departure.capacity - departure.bookedSeats;

      return (
        departure.status !== "SOLD_OUT" &&
        departure.status !== "CLOSED" &&
        seatsLeft > 0
      );
    }),
  ).length;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border bg-[#001F3F] text-white shadow-sm">
        <div className="flex flex-col gap-5 px-6 py-7 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-200">
              Agent Sales Workspace
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Tours to Sell
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
              Find the right journey for your clients, review live departures,
              see your commission and net price, and move directly into a
              booking or custom request.
            </p>
          </div>

          <Link
            href="/b2b/custom-requests"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#001F3F] transition hover:bg-slate-100"
          >
            Request a Custom Journey
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Published Tours"
          value={tours.length}
        />

        <SummaryCard
          label="Tours with Availability"
          value={availableTourCount}
        />

        <SummaryCard
          label="My Commission Setup"
          value={
            agent.commissionRate
              ? `${(agent.commissionRate * 100).toFixed(0)}% default`
              : "Custom / Tour Based"
          }
        />
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-[#001F3F]" />

          <h2 className="text-xl font-semibold text-[#001F3F]">
            Find a Tour
          </h2>
        </div>

        <form className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
          <label>
            <span className="text-sm font-semibold text-slate-700">
              Search
            </span>

            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Italy, pilgrimage, Cappadocia..."
              className={inputClass}
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">
              Category
            </span>

            <select
              name="category"
              defaultValue={categoryFilter}
              className={inputClass}
            >
              <option value="">All Categories</option>

              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">
              Availability
            </span>

            <select
              name="availability"
              defaultValue={availabilityFilter}
              className={inputClass}
            >
              <option value="available">
                Available Tours
              </option>
              <option value="all">
                All Published Tours
              </option>
            </select>
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="h-11 rounded-xl bg-[#8B0000] px-5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
            >
              Apply
            </button>

            <Link
              href="/b2b/tours"
              className="inline-flex h-11 items-center rounded-xl border px-4 text-sm font-semibold text-slate-700 transition hover:border-[#8B0000] hover:text-[#8B0000]"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
              Sellable Products
            </p>

            <h2 className="mt-1 text-xl font-semibold text-[#001F3F]">
              Available Journeys
            </h2>
          </div>

          <p className="text-sm text-slate-500">
            {filteredTours.length}{" "}
            {filteredTours.length === 1 ? "tour" : "tours"} found
          </p>
        </div>

        {filteredTours.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed bg-white p-10 text-center">
            <p className="font-semibold text-[#001F3F]">
              No tours matched your filters
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try changing the search or availability filter.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredTours.map((tour) => {
              const firstAvailableDeparture = tour.departureDates.find(
                (departure) => {
                  const seatsLeft =
                    departure.capacity - departure.bookedSeats;

                  return (
                    departure.status !== "SOLD_OUT" &&
                    departure.status !== "CLOSED" &&
                    seatsLeft > 0
                  );
                },
              );

              const nextDeparture =
                firstAvailableDeparture ?? tour.departureDates[0] ?? null;

              const override = overrides.find(
                (item) => item.tourId === tour.id,
              );

              const effectiveCommissionRate =
                override?.commissionRate ??
                agent.commissionRate ??
                null;

              const price = firstAvailableDeparture
                ? Number(firstAvailableDeparture.price)
                : 0;

              const commission = calculateCommission(
                price,
                effectiveCommissionRate,
              );

              const net = calculateNet(
                price,
                effectiveCommissionRate,
              );

              const seatsLeft = firstAvailableDeparture
                ? Math.max(
                    0,
                    firstAvailableDeparture.capacity -
                      firstAvailableDeparture.bookedSeats,
                  )
                : 0;

              return (
                <article
                  key={tour.id}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative h-52 bg-slate-100">
                    {tour.mainImageUrl ? (
                      <Image
                        src={tour.mainImageUrl}
                        alt={tour.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        Tour image coming soon
                      </div>
                    )}

                    {firstAvailableDeparture ? (
                      <span
                        className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold ${getAvailabilityTone(
                          firstAvailableDeparture.status,
                          seatsLeft,
                        )}`}
                      >
                        {seatsLeft <= 5
                          ? `Only ${seatsLeft} left`
                          : getStatusLabel(firstAvailableDeparture.status)}
                      </span>
                    ) : (
                      <span className="absolute left-4 top-4 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-bold text-white">
                        No current availability
                      </span>
                    )}
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#8B0000]">
                        {tour.category || "Journey"}
                      </p>

                      <h3 className="mt-1 text-xl font-bold leading-7 text-[#001F3F]">
                        {tour.title}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" />
                          {tour.duration} days
                        </span>

                        {tour.destinations.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            {tour.destinations.slice(0, 2).join(", ")}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {nextDeparture ? (
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          {firstAvailableDeparture
                            ? "Next Available Departure"
                            : "Next Departure"}
                        </p>

                        <p className="mt-1 font-semibold text-[#001F3F]">
                          {formatDate(nextDeparture.date)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {getSeasonLabel(nextDeparture.season)} ·{" "}
                          {getStatusLabel(nextDeparture.status)}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                        Departure dates will be announced.
                      </div>
                    )}

                    {firstAvailableDeparture ? (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <PriceBlock
                          label="Gross"
                          value={formatCurrency(price)}
                        />

                        <PriceBlock
                          label="Commission"
                          value={formatCurrency(commission)}
                          emphasis="green"
                        />

                        <PriceBlock
                          label="Net"
                          value={formatCurrency(net)}
                          emphasis="navy"
                        />
                      </div>
                    ) : null}

                    {firstAvailableDeparture ? (
                      <div className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
                        <div className="inline-flex items-center gap-2 text-slate-600">
                          <Users className="h-4 w-4" />
                          Seats available
                        </div>

                        <span className="font-bold text-[#001F3F]">
                          {seatsLeft}
                        </span>
                      </div>
                    ) : null}

                    {override ? (
                      <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                        Custom commission applied for your agency
                      </div>
                    ) : null}

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Link
                        href={`/b2b/tours/${tour.id}`}
                        className="inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold text-[#001F3F] transition hover:border-[#8B0000] hover:text-[#8B0000]"
                      >
                        View Tour
                      </Link>

                      {firstAvailableDeparture && !tour.requiresQuote ? (
                        <Link
                          href={`/b2b/tours/${tour.id}/book?departureId=${firstAvailableDeparture.id}`}
                          className="inline-flex items-center justify-center rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
                        >
                          Book Now
                        </Link>
                      ) : tour.requiresQuote ? (
                        <Link
                          href="/b2b/custom-requests"
                          className="inline-flex items-center justify-center rounded-xl bg-[#8B0000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f0000]"
                        >
                          Request Quote
                        </Link>
                      ) : (
                        <span className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400">
                          Not Available
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-[#001F3F]">
        {value}
      </p>
    </div>
  );
}

function PriceBlock({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: "green" | "navy";
}) {
  const valueClass =
    emphasis === "green"
      ? "text-emerald-700"
      : emphasis === "navy"
        ? "text-[#001F3F]"
        : "text-slate-900";

  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className={`mt-1 font-bold ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#8B0000] focus:ring-4 focus:ring-red-50";
