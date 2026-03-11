import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{
    id: string;
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

export default async function B2BTourDetailPage({ params }: PageProps) {
  const { id } = await params;

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

  const availableDepartures = tour.departureDates.filter(
    (departure) => departure.status !== "CLOSED"
  );

  return (
    <div className="space-y-8">
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
              <p className="text-sm font-medium uppercase tracking-wide text-red-700">
                {tour.category}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#001F3F]">
                {tour.title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {tour.duration} days
                {tour.destinations.length > 0
                  ? ` • ${tour.destinations.join(", ")}`
                  : ""}
              </p>
            </div>

            {tour.shortDescription && (
              <p className="text-sm leading-6 text-gray-700">
                {tour.shortDescription}
              </p>
            )}

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

            <div className="flex flex-wrap gap-3">
              {tour.brochureUrl && (
                <a
                  href={tour.brochureUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
                >
                  Download Brochure
                </a>
              )}

              {!tour.requiresQuote && availableDepartures.length > 0 && (
                <Link
                  href={`/b2b/tours/${tour.id}/book`}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
                >
                  Book This Tour
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {tour.overview && (
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">Overview</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
            {tour.overview}
          </p>
        </section>
      )}

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
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Departure Dates
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a departure and proceed to booking.
          </p>
        </div>

        {availableDepartures.length === 0 ? (
          <div className="rounded-xl border bg-gray-50 p-6 text-sm text-muted-foreground">
            No departures available yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Season</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Capacity</th>
                  <th className="p-3">Booked</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {availableDepartures.map((departure) => {
                  const seatsLeft = departure.capacity - departure.bookedSeats;
                  const isBookable =
                    departure.status !== "SOLD_OUT" &&
                    departure.status !== "CLOSED" &&
                    seatsLeft > 0 &&
                    !tour.requiresQuote;

                  return (
                    <tr key={departure.id} className="border-t">
                      <td className="p-3">{formatDate(departure.date)}</td>
                      <td className="p-3">{departure.season}</td>
                      <td className="p-3">{formatCurrency(departure.price)}</td>
                      <td className="p-3">{departure.capacity}</td>
                      <td className="p-3">{departure.bookedSeats}</td>
                      <td className="p-3">{departure.status}</td>
                      <td className="p-3">
                        {isBookable ? (
                          <Link
                            href={`/b2b/tours/${tour.id}/book?departureId=${departure.id}`}
                            className="inline-flex rounded-lg bg-red-700 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-800"
                          >
                            Book
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Not available
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