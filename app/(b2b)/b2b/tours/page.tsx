import { db } from "@/lib/db";
import Link from "next/link";

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

export default async function B2BToursPage() {
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
        },
      },
    },
  });

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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                View tours, choose departures, book faster
              </div>
            </div>
          </div>
        </div>
      </section>

      {tours.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-muted-foreground shadow-sm">
          No published tours available yet.
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
              ? displayDeparture.capacity - displayDeparture.bookedSeats
              : 0;

            const canBook =
              !!firstAvailableDeparture && !tour.requiresQuote;

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

                      {tour.requiresQuote && (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                          Quote Required
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 text-xl font-semibold text-[#001F3F]">
                      {tour.title}
                    </h2>

                    {tour.destinations.length > 0 && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {tour.destinations.join(" • ")}
                      </p>
                    )}
                  </div>

                  {tour.shortDescription && (
                    <p className="line-clamp-3 text-sm leading-6 text-gray-700">
                      {tour.shortDescription}
                    </p>
                  )}

                  <div className="rounded-xl bg-gray-50 p-4 text-sm">
                    {displayDeparture ? (
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-[#001F3F]">
                            Next departure:
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
                            Status:
                          </span>{" "}
                          {displayDeparture.status}
                        </div>

                        <div>
                          <span className="font-medium text-[#001F3F]">
                            Seats left:
                          </span>{" "}
                          {seatsLeft > 0 ? seatsLeft : 0}
                        </div>
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
                        Book
                      </Link>
                    ) : (
                      <span className="inline-flex rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500">
                        {tour.requiresQuote ? "Request Quote" : "Not Available"}
                      </span>
                    )}

                    {tour.brochureUrl && (
                      <a
                        href={tour.brochureUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
                      >
                        Brochure
                      </a>
                    )}
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