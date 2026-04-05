import Link from "next/link";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import BookingForm from "@/components/b2b/BookingForm";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    departureId?: string;
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

export default async function BookTourPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/agent-login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      approved: true,
      status: true,
      fullName: true,
      travelAgency: true,
      commissionRate: true,
    },
  });

  if (
    !user ||
    user.role !== "AGENT" ||
    !user.approved ||
    user.status !== "ACTIVE"
  ) {
    redirect("/agent-login");
  }

  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const departureId = resolvedSearchParams.departureId;

  const tour = await db.tour.findUnique({
    where: { id },
    include: {
      departureDates: {
        orderBy: { date: "asc" },
      },
      pricingTiers: {
        where: { isActive: true },
        orderBy: [{ minPax: "asc" }, { maxPax: "asc" }],
      },
    },
  });

  if (!tour || !tour.isPublished) {
    redirect("/b2b/tours");
  }

  const visibleDepartures = tour.departureDates.filter(
    (departure) => departure.status !== "CLOSED"
  );

  if (visibleDepartures.length === 0) {
    redirect(`/b2b/tours/${tour.id}`);
  }

  const selectedDeparture =
    visibleDepartures.find((departure) => departure.id === departureId) ??
    visibleDepartures.find((departure) => {
      const seatsLeft = departure.capacity - departure.bookedSeats;

      return (
        departure.status !== "SOLD_OUT" &&
        departure.status !== "CLOSED" &&
        seatsLeft > 0
      );
    }) ??
    visibleDepartures[0];

  const selectedSeatsLeft = Math.max(
    selectedDeparture.capacity - selectedDeparture.bookedSeats,
    0
  );

  const selectedDepartureBookable =
    !tour.requiresQuote &&
    selectedDeparture.status !== "SOLD_OUT" &&
    selectedDeparture.status !== "CLOSED" &&
    selectedSeatsLeft > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/b2b/tours/${tour.id}`}
          className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
        >
          Back to Tour
        </Link>

        <Link
          href="/b2b/tours"
          className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-red-700 hover:text-red-700"
        >
          Back to Tours
        </Link>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#001F3F]">
              Book Tour
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete the booking form for this tour.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <div className="font-medium text-[#001F3F]">
              Agent: {user.fullName || "Partner"}
            </div>
            <div className="mt-1 text-muted-foreground">
              {user.travelAgency || "Agency not provided"}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Tour Summary
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">Tour</div>
              <div className="font-medium text-[#001F3F]">{tour.title}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Category</div>
              <div className="font-medium">{tour.category}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Duration</div>
              <div className="font-medium">{tour.duration} days</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Destinations</div>
              <div className="font-medium">
                {tour.destinations.length > 0
                  ? tour.destinations.join(", ")
                  : "-"}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Booking Type</div>
              <div className="font-medium">
                {tour.requiresQuote ? "Quote Required" : "Direct Booking"}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Pricing Type</div>
              <div className="font-medium">{tour.pricingType}</div>
            </div>
          </div>

          {tour.shortDescription ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-gray-700">
              {tour.shortDescription}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#001F3F]">
            Selected Departure
          </h2>

          <div className="mt-6 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">
                {formatDate(selectedDeparture.date)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Season</span>
              <span className="font-medium">{selectedDeparture.season}</span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Price</span>
              <span className="font-medium">
                {formatCurrency(selectedDeparture.price)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Status</span>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                  selectedDeparture.status
                )}`}
              >
                {getStatusLabel(selectedDeparture.status)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Capacity</span>
              <span className="font-medium">{selectedDeparture.capacity}</span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Booked</span>
              <span className="font-medium">{selectedDeparture.bookedSeats}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Seats Left</span>
              <span className="font-medium">{selectedSeatsLeft}</span>
            </div>
          </div>

          {selectedDeparture.status === "EARLY_BOOKING" &&
          selectedDeparture.earlyDiscountPercent ? (
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
              <div className="font-medium">
                Early Booking Discount: {selectedDeparture.earlyDiscountPercent}%
              </div>

              {selectedDeparture.earlyDiscountDeadline ? (
                <div className="mt-1 text-xs">
                  Valid until {formatDate(selectedDeparture.earlyDiscountDeadline)}
                </div>
              ) : null}
            </div>
          ) : null}

          {!selectedDepartureBookable ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              {tour.requiresQuote
                ? "This tour requires a quote request instead of direct booking."
                : selectedDeparture.status === "SOLD_OUT"
                ? "This departure is sold out."
                : selectedDeparture.status === "CLOSED"
                ? "This departure is closed."
                : "This departure is not currently available for booking."}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <BookingForm
          tourId={tour.id}
          pricingType={tour.pricingType}
          pricingTiers={tour.pricingTiers.map((tier) => ({
            label: tier.label,
            minPax: tier.minPax,
            maxPax: tier.maxPax,
            roomType: tier.roomType,
            pricePerPerson: tier.pricePerPerson,
            currency: tier.currency,
            isActive: tier.isActive,
          }))}
          commissionRate={user.commissionRate ?? 0}
          departures={visibleDepartures.map((departure) => ({
            id: departure.id,
            date: departure.date.toISOString(),
            season: departure.season,
            price: departure.price,
            capacity: departure.capacity,
            bookedSeats: departure.bookedSeats,
            status: String(departure.status),
          }))}
          selectedDepartureId={selectedDeparture.id}
        />
      </section>
    </div>
  );
}