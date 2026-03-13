import { db } from "@/lib/db";
import Link from "next/link";

type ToursPageProps = {
  searchParams?: Promise<{
    category?: string;
    destination?: string;
    sort?: string;
  }>;
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-GB", {
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

export default async function B2BToursPage({
  searchParams,
}: ToursPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  const categoryFilter = resolvedSearchParams.category?.trim() || "";
  const destinationFilter = resolvedSearchParams.destination?.trim() || "";
  const sort = resolvedSearchParams.sort?.trim() || "newest";

  const orderBy =
    sort === "title-asc"
      ? { title: "asc" as const }
      : sort === "duration-asc"
      ? { duration: "asc" as const }
      : sort === "duration-desc"
      ? { duration: "desc" as const }
      : { createdAt: "desc" as const };

  const tours = await db.tour.findMany({
    where: {
      isPublished: true,
      ...(categoryFilter ? { category: categoryFilter } : {}),
      ...(destinationFilter
        ? { destinations: { has: destinationFilter } }
        : {}),
    },
    orderBy,
    select: {
      id: true,
      title: true,
      category: true,
      duration: true,
      destinations: true,
      shortDescription: true,
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

  const filterSourceTours = await db.tour.findMany({
    where: {
      isPublished: true,
    },
    select: {
      category: true,
      destinations: true,
    },
  });

  const categories = Array.from(
    new Set(filterSourceTours.map((tour) => tour.category).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const destinations = Array.from(
    new Set(
      filterSourceTours.flatMap((tour) => tour.destinations).filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const totalTours = tours.length;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#001F3F]">Tour Library</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse available B2B tours, review upcoming departures, and begin
              bookings for your clients.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/b2b/dashboard"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
            >
              Back to Dashboard
            </Link>

            <Link
              href="/b2b/resources"
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
            >
              Resources
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Published Tours
            </div>
            <div className="mt-1 text-2xl font-semibold text-[#001F3F]">
              {totalTours}
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Portal Use
            </div>
            <div className="mt-1 text-sm font-medium text-[#001F3F]">
              View tours, choose departures, and book faster
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[#001F3F]">
              Filter Tours
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Narrow the list by category, destination, or sort order.
            </p>
          </div>

          <form className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                name="category"
                defaultValue={categoryFilter}
                className="h-10 w-full rounded-md border bg-white px-3 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Destination</label>
              <select
                name="destination"
                defaultValue={destinationFilter}
                className="h-10 w-full rounded-md border bg-white px-3 text-sm"
              >
                <option value="">All Destinations</option>
                {destinations.map((destination) => (
                  <option key={destination} value={destination}>
                    {destination}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <select
                name="sort"
                defaultValue={sort}
                className="h-10 w-full rounded-md border bg-white px-3 text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="title-asc">Title A–Z</option>
                <option value="duration-asc">Duration: Shortest First</option>
                <option value="duration-desc">Duration: Longest First</option>
              </select>
            </div>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="h-10 rounded-md bg-red-700 px-4 text-sm font-medium text-white transition hover:bg-red-800"
              >
                Apply
              </button>

              <Link
                href="/b2b/tours"
                className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
              >
                Clear
              </Link>
            </div>
          </form>
        </div>
      </section>

      {tours.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-muted-foreground shadow-sm">
          No published tours matched your current filters.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {tours.map((tour) => {
            const firstAvailableDeparture = tour.departureDates.find(
              (departure) =>
                departure.status !== "SOLD_OUT" &&
                departure.status !== "CLOSED" &&
                departure.capacity - departure.bookedSeats > 0
            );

            const fallbackDeparture = tour.departureDates[0];
            const displayDeparture =
              firstAvailableDeparture ?? fallbackDeparture ?? null;

            const seatsLeft = displayDeparture
              ? Math.max(displayDeparture.capacity - displayDeparture.bookedSeats, 0)
              : 0;

            const canBook = !!firstAvailableDeparture && !tour.requiresQuote;

            return (
              <article
                key={tour.id}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="h-52 bg-gray-100">
                  {tour.mainImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tour.mainImageUrl}
                      alt={tour.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No image available
                    </div>
                  )}
                </div>

                <div className="space-y-5 p-5">
                  <div>
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

                    <h2 className="mt-3 text-xl font-semibold text-[#001F3F]">
                      {tour.title}
                    </h2>

                    {tour.destinations.length > 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {tour.destinations.join(" • ")}
                      </p>
                    ) : null}
                  </div>

                  {tour.shortDescription ? (
                    <p className="line-clamp-3 text-sm leading-6 text-gray-700">
                      {tour.shortDescription}
                    </p>
                  ) : null}

                  <div className="rounded-xl bg-gray-50 p-4 text-sm">
                    {displayDeparture ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium text-[#001F3F]">
                            Next Departure
                          </div>

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                              displayDeparture.status
                            )}`}
                          >
                            {getStatusLabel(displayDeparture.status)}
                          </span>
                        </div>

                        <div>
                          <span className="font-medium text-[#001F3F]">
                            Date:
                          </span>{" "}
                          {formatDate(displayDeparture.date)}
                        </div>

                        <div>
                          <span className="font-medium text-[#001F3F]">
                            Season:
                          </span>{" "}
                          {displayDeparture.season}
                        </div>

                        <div>
                          <span className="font-medium text-[#001F3F]">
                            From:
                          </span>{" "}
                          {formatCurrency(displayDeparture.price)}
                        </div>

                        <div>
                          <span className="font-medium text-[#001F3F]">
                            Seats:
                          </span>{" "}
                          {displayDeparture.bookedSeats} / {displayDeparture.capacity} booked
                        </div>

                        <div>
                          <span className="font-medium text-[#001F3F]">
                            Seats Left:
                          </span>{" "}
                          {seatsLeft}
                        </div>

                        {displayDeparture.status === "EARLY_BOOKING" &&
                        displayDeparture.earlyDiscountPercent ? (
                          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700">
                            <div className="font-medium">
                              Early Booking Discount:{" "}
                              {displayDeparture.earlyDiscountPercent}%
                            </div>

                            {displayDeparture.earlyDiscountDeadline ? (
                              <div className="mt-1 text-xs">
                                Valid until{" "}
                                {formatDate(displayDeparture.earlyDiscountDeadline)}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        No departure dates available yet.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/b2b/tours/${tour.id}`}
                      className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
                    >
                      View Tour
                    </Link>

                    {canBook && firstAvailableDeparture ? (
                      <Link
                        href={`/b2b/tours/${tour.id}/book?departureId=${firstAvailableDeparture.id}`}
                        className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
                      >
                        Book Now
                      </Link>
                    ) : (
                      <span className="inline-flex rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500">
                        {tour.requiresQuote
                          ? "Request Quote"
                          : displayDeparture?.status === "SOLD_OUT"
                          ? "Sold Out"
                          : displayDeparture?.status === "CLOSED"
                          ? "Closed"
                          : "Not Available"}
                      </span>
                    )}

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
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}