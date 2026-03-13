import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: {
    id: string;
  };
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

export default async function B2BTourDetailPage({ params }: PageProps) {
  const { id } = params;

  const tour = await db.tour.findUnique({
    where: { id },
    include: {
      departureDates: {
        orderBy: {
          date: "asc",
        },
      },
    },
  });

  if (!tour || !tour.isPublished) {
    notFound();
  }

  const visibleDepartures = tour.departureDates.filter(
    (departure) => departure.status !== "CLOSED"
  );

  const firstBookableDeparture = visibleDepartures.find((departure) => {
    const seatsLeft = departure.capacity - departure.bookedSeats;

    return (
      departure.status !== "SOLD_OUT" &&
      departure.status !== "CLOSED" &&
      seatsLeft > 0
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <Link
          href="/b2b/tours"
          className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
        >
          Back to Tours
        </Link>

        <Link
          href="/b2b/dashboard"
          className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
        >
          Back to Dashboard
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="h-72 bg-gray-100 lg:h-full">
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

          <div className="space-y-5 p-6 lg:p-8">
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

              <h1 className="mt-3 text-3xl font-bold text-[#001F3F]">
                {tour.title}
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                {tour.destinations.length > 0
                  ? tour.destinations.join(" • ")
                  : "Destination details coming soon"}
              </p>
            </div>

            {tour.shortDescription ? (
              <p className="text-sm leading-6 text-gray-700">
                {tour.shortDescription}
              </p>
            ) : null}

            {tour.subcategories.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tour.subcategories.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {tour.brochureUrl ? (
                <a
                  href={tour.brochureUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
                >
                  Download Brochure
                </a>
              ) : null}

              {tour.mapImageUrl ? (
                <a
                  href={tour.mapImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
                >
                  View Map
                </a>
              ) : null}

              {!tour.requiresQuote && firstBookableDeparture ? (
                <Link
                  href={`/b2b/tours/${tour.id}/book?departureId=${firstBookableDeparture.id}`}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
                >
                  Book This Tour
                </Link>
              ) : (
                <span className="inline-flex rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500">
                  {tour.requiresQuote ? "Request Quote" : "Booking Not Available"}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {tour.overview ? (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">Overview</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
            {tour.overview}
          </p>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">Highlights</h2>

          {tour.highlights.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No highlights added yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              {tour.highlights.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-2">
                  <span className="mt-1 text-red-700">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">Inclusions</h2>

          {tour.inclusions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No inclusions added yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              {tour.inclusions.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-2">
                  <span className="mt-1 text-red-700">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">Exclusions</h2>

          {tour.exclusions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No exclusions added yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              {tour.exclusions.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-2">
                  <span className="mt-1 text-red-700">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Accommodations
          </h2>

          {tour.accommodations.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No accommodations added yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              {tour.accommodations.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-2">
                  <span className="mt-1 text-red-700">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Departure Dates
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a departure and proceed to booking.
          </p>
        </div>

        {visibleDepartures.length === 0 ? (
          <div className="rounded-xl border bg-gray-50 p-6 text-sm text-muted-foreground">
            No departures available yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Season</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Capacity</th>
                  <th className="p-3">Booked</th>
                  <th className="p-3">Seats Left</th>
                  <th className="p-3">Early Booking</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleDepartures.map((departure) => {
                  const seatsLeft = Math.max(
                    departure.capacity - departure.bookedSeats,
                    0
                  );

                  const isBookable =
                    departure.status !== "SOLD_OUT" &&
                    departure.status !== "CLOSED" &&
                    seatsLeft > 0 &&
                    !tour.requiresQuote;

                  return (
                    <tr key={departure.id} className="border-t align-middle">
                      <td className="p-3">{formatDate(departure.date)}</td>
                      <td className="p-3">{departure.season}</td>
                      <td className="p-3">{formatCurrency(departure.price)}</td>

                      <td className="p-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                            departure.status
                          )}`}
                        >
                          {getStatusLabel(departure.status)}
                        </span>
                      </td>

                      <td className="p-3">{departure.capacity}</td>
                      <td className="p-3">{departure.bookedSeats}</td>
                      <td className="p-3">{seatsLeft}</td>

                      <td className="p-3">
                        {departure.status === "EARLY_BOOKING" &&
                        departure.earlyDiscountPercent ? (
                          <div className="space-y-1">
                            <div className="font-medium text-blue-700">
                              {departure.earlyDiscountPercent}% discount
                            </div>
                            {departure.earlyDiscountDeadline ? (
                              <div className="text-xs text-muted-foreground">
                                Until {formatDate(departure.earlyDiscountDeadline)}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="p-3">
                        {isBookable ? (
                          <Link
                            href={`/b2b/tours/${tour.id}/book?departureId=${departure.id}`}
                            className="inline-flex rounded-lg bg-red-700 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-800"
                          >
                            Book Now
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {tour.requiresQuote
                              ? "Quote Required"
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