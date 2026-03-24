import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DepartureStatus, Season } from "@prisma/client";

import { db } from "@/lib/db";
import { AddDepartureForm } from "@/components/admin/AddDepartureForm";
import { EditDepartureFields } from "@/components/admin/EditDepartureFields";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    success?: string;
    error?: string;
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
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateInput(value: Date | null) {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

function getStatusLabel(status: DepartureStatus) {
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

function getStatusBadgeClass(status: DepartureStatus) {
  switch (status) {
    case "EARLY_BOOKING":
      return "bg-amber-100 text-amber-800";
    case "AVAILABLE":
      return "bg-green-100 text-green-800";
    case "SOLD_OUT":
      return "bg-red-100 text-red-800";
    case "CLOSED":
      return "bg-gray-200 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function parseStatus(value: string): DepartureStatus {
  const allowedStatuses: DepartureStatus[] = [
    "EARLY_BOOKING",
    "AVAILABLE",
    "SOLD_OUT",
    "CLOSED",
  ];

  return allowedStatuses.includes(value as DepartureStatus)
    ? (value as DepartureStatus)
    : "AVAILABLE";
}

function getSeasonLabel(season: Season) {
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

function parseSeason(value: string): Season {
  const allowedSeasons: Season[] = ["LOW", "SHOULDER", "HIGH", "PEAK"];

  return allowedSeasons.includes(value as Season)
    ? (value as Season)
    : "SHOULDER";
}

async function createDeparture(tourId: string, formData: FormData) {
  "use server";

  const dateValue = formData.get("date");
  const seasonValue = formData.get("season");
  const priceValue = formData.get("price");
  const capacityValue = formData.get("capacity");
  const statusValue = formData.get("status");
  const earlyDiscountPercentValue = formData.get("earlyDiscountPercent");
  const earlyDiscountDeadlineValue = formData.get("earlyDiscountDeadline");

  if (
    typeof dateValue !== "string" ||
    typeof seasonValue !== "string" ||
    typeof priceValue !== "string" ||
    typeof capacityValue !== "string" ||
    typeof statusValue !== "string"
  ) {
    return;
  }

  const date = new Date(dateValue);
  const season = parseSeason(seasonValue);
  const price = Number(priceValue);
  const capacity = Number(capacityValue);

  if (
    Number.isNaN(date.getTime()) ||
    Number.isNaN(price) ||
    price < 0 ||
    Number.isNaN(capacity) ||
    capacity < 0
  ) {
    return;
  }

  const status = parseStatus(statusValue);

  const earlyDiscountPercent =
    typeof earlyDiscountPercentValue === "string" &&
    earlyDiscountPercentValue.trim() !== ""
      ? Number(earlyDiscountPercentValue)
      : null;

  const validEarlyDiscountPercent =
    earlyDiscountPercent !== null &&
    !Number.isNaN(earlyDiscountPercent) &&
    earlyDiscountPercent >= 0
      ? earlyDiscountPercent
      : null;

  const earlyDiscountDeadline =
    typeof earlyDiscountDeadlineValue === "string" &&
    earlyDiscountDeadlineValue.trim() !== ""
      ? new Date(earlyDiscountDeadlineValue)
      : null;

  const validEarlyDiscountDeadline =
    earlyDiscountDeadline &&
    !Number.isNaN(earlyDiscountDeadline.getTime())
      ? earlyDiscountDeadline
      : null;

  await db.departureDate.create({
    data: {
      tourId,
      date,
      season,
      price,
      capacity,
      bookedSeats: 0,
      status,
      earlyDiscountPercent: validEarlyDiscountPercent,
      earlyDiscountDeadline: validEarlyDiscountDeadline,
    },
  });

  redirect(`/admin/tours/${tourId}/departures`);
}

async function updateDeparture(
  tourId: string,
  departureId: string,
  formData: FormData
) {
  "use server";

  const dateValue = formData.get("date");
  const seasonValue = formData.get("season");
  const priceValue = formData.get("price");
  const capacityValue = formData.get("capacity");
  const statusValue = formData.get("status");
  const earlyDiscountPercentValue = formData.get("earlyDiscountPercent");
  const earlyDiscountDeadlineValue = formData.get("earlyDiscountDeadline");

  if (
    typeof dateValue !== "string" ||
    typeof seasonValue !== "string" ||
    typeof priceValue !== "string" ||
    typeof capacityValue !== "string" ||
    typeof statusValue !== "string"
  ) {
    return;
  }

  const existingDeparture = await db.departureDate.findUnique({
    where: { id: departureId },
    select: {
      id: true,
      tourId: true,
      bookedSeats: true,
      price: true,
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  });

  if (!existingDeparture || existingDeparture.tourId !== tourId) {
    return;
  }

  const date = new Date(dateValue);
  const season = parseSeason(seasonValue);
  const price = Number(priceValue);
  const capacity = Number(capacityValue);

  if (
    Number.isNaN(date.getTime()) ||
    Number.isNaN(price) ||
    price < 0 ||
    Number.isNaN(capacity) ||
    capacity < 0
  ) {
    return;
  }

  if (capacity < existingDeparture.bookedSeats) {
    redirect(`/admin/tours/${tourId}/departures?error=capacity-below-booked`);
  }

  if (
    existingDeparture._count.bookings > 0 &&
    price !== Number(existingDeparture.price)
  ) {
    redirect(`/admin/tours/${tourId}/departures?error=price-locked`);
  }

  const status = parseStatus(statusValue);

  const earlyDiscountPercent =
    typeof earlyDiscountPercentValue === "string" &&
    earlyDiscountPercentValue.trim() !== ""
      ? Number(earlyDiscountPercentValue)
      : null;

  const validEarlyDiscountPercent =
    earlyDiscountPercent !== null &&
    !Number.isNaN(earlyDiscountPercent) &&
    earlyDiscountPercent >= 0
      ? earlyDiscountPercent
      : null;

  const earlyDiscountDeadline =
    typeof earlyDiscountDeadlineValue === "string" &&
    earlyDiscountDeadlineValue.trim() !== ""
      ? new Date(earlyDiscountDeadlineValue)
      : null;

  const validEarlyDiscountDeadline =
    earlyDiscountDeadline &&
    !Number.isNaN(earlyDiscountDeadline.getTime())
      ? earlyDiscountDeadline
      : null;

  await db.departureDate.update({
    where: {
      id: departureId,
      tourId,
    },
    data: {
      date,
      season,
      price,
      capacity,
      status,
      earlyDiscountPercent: validEarlyDiscountPercent,
      earlyDiscountDeadline: validEarlyDiscountDeadline,
    },
  });

  redirect(`/admin/tours/${tourId}/departures`);
}

async function deleteDeparture(tourId: string, departureId: string) {
  "use server";

  const existingDeparture = await db.departureDate.findUnique({
    where: { id: departureId },
    select: {
      id: true,
      tourId: true,
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  });

  if (!existingDeparture || existingDeparture.tourId !== tourId) {
    return;
  }

  if (existingDeparture._count.bookings > 0) {
    redirect(`/admin/tours/${tourId}/departures?error=departure-has-bookings`);
  }

  await db.departureDate.delete({
    where: {
      id: departureId,
    },
  });

  redirect(`/admin/tours/${tourId}/departures?success=departure-deleted`);
}

export default async function AdminTourDeparturesPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { success, error } = await searchParams;

  const tour = await db.tour.findUnique({
    where: { id },
    include: {
      seasonalPrices: true,
      departureDates: {
        orderBy: {
          date: "asc",
        },
        include: {
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      },
    },
  });

  if (!tour) {
    notFound();
  }

  const seasonalPriceMap: Record<Season, number | null> = {
    LOW: null,
    SHOULDER: null,
    HIGH: null,
    PEAK: null,
  };

  for (const seasonalPrice of tour.seasonalPrices) {
    seasonalPriceMap[seasonalPrice.season] = seasonalPrice.price;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Departures</h1>
          <p className="text-sm text-muted-foreground">
            {tour.title} — add, edit, and manage departure dates and pricing.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/admin/tours/${tour.id}/seasonal-prices`}
            className="text-sm underline underline-offset-4"
          >
            Seasonal Prices
          </Link>

          <Link
            href={`/admin/tours/${tour.id}/edit`}
            className="text-sm underline underline-offset-4"
          >
            Edit Tour
          </Link>

          <Link
            href="/admin/tours"
            className="text-sm underline underline-offset-4"
          >
            Back to Tours
          </Link>
        </div>
      </div>

      {success === "departure-deleted" && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Departure deleted successfully.
        </div>
      )}

      {error === "departure-has-bookings" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Cannot delete this departure because it has existing bookings.
        </div>
      )}

      {error === "capacity-below-booked" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Capacity cannot be lower than the number of already booked seats.
        </div>
      )}

      {error === "price-locked" && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Price cannot be changed because this departure already has bookings.
        </div>
      )}

      <section className="rounded-lg border bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Add Departure</h2>
          <p className="text-sm text-muted-foreground">
            Create a new departure date for this tour.
          </p>
        </div>

        <form
          action={createDeparture.bind(null, tour.id)}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <AddDepartureForm seasonalPrices={seasonalPriceMap} />

          <div className="md:col-span-2 xl:col-span-4">
            <button
              type="submit"
              className="rounded bg-red-700 px-4 py-2 text-white hover:bg-red-800"
            >
              Add Departure
            </button>
          </div>
        </form>
      </section>

      <div className="space-y-4">
        {tour.departureDates.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-gray-500">
            No departures created yet.
          </div>
        ) : (
          tour.departureDates.map((departure) => {
            const remainingSeats = Math.max(
              0,
              departure.capacity - departure.bookedSeats
            );

            const hasBookings = departure._count.bookings > 0;

            return (
              <div key={departure.id} className="rounded-lg border bg-white p-6">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {formatDate(departure.date)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getSeasonLabel(departure.season)} ·{" "}
                      {formatCurrency(Number(departure.price))}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                        departure.status
                      )}`}
                    >
                      {getStatusLabel(departure.status)}
                    </span>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                      Remaining Seats: {remainingSeats}
                    </span>

                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-800">
                      Booked: {departure.bookedSeats} / {departure.capacity}
                    </span>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800">
                      Bookings: {departure._count.bookings}
                    </span>
                  </div>
                </div>

                <form
                  action={updateDeparture.bind(null, tour.id, departure.id)}
                  className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
                >
                  <div>
                    <label
                      htmlFor={`date-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Date
                    </label>
                    <input
                      id={`date-${departure.id}`}
                      name="date"
                      type="date"
                      required
                      defaultValue={formatDateInput(departure.date)}
                      className="mt-1 w-full rounded border p-2"
                    />
                  </div>

                  <EditDepartureFields
                    departureId={departure.id}
                    initialSeason={departure.season}
                    initialPrice={Number(departure.price)}
                    seasonalPrices={seasonalPriceMap}
                    priceLocked={hasBookings}
                  />

                  <div>
                    <label
                      htmlFor={`status-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Status
                    </label>
                    <select
                      id={`status-${departure.id}`}
                      name="status"
                      defaultValue={departure.status}
                      className="mt-1 w-full rounded border p-2"
                    >
                      <option value="EARLY_BOOKING">Early Booking</option>
                      <option value="AVAILABLE">Available</option>
                      <option value="SOLD_OUT">Sold Out</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`capacity-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Capacity
                    </label>
                    <input
                      id={`capacity-${departure.id}`}
                      name="capacity"
                      type="number"
                      min="0"
                      required
                      defaultValue={departure.capacity}
                      className="mt-1 w-full rounded border p-2"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`booked-info-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Booked Seats
                    </label>
                    <div
                      id={`booked-info-${departure.id}`}
                      className="mt-1 rounded border bg-gray-50 p-2 text-sm text-gray-700"
                    >
                      {departure.bookedSeats} booked / {departure.capacity} capacity
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor={`earlyDiscountPercent-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Early Discount %
                    </label>
                    <input
                      id={`earlyDiscountPercent-${departure.id}`}
                      name="earlyDiscountPercent"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={departure.earlyDiscountPercent ?? ""}
                      className="mt-1 w-full rounded border p-2"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`earlyDiscountDeadline-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Early Discount Deadline
                    </label>
                    <input
                      id={`earlyDiscountDeadline-${departure.id}`}
                      name="earlyDiscountDeadline"
                      type="date"
                      defaultValue={formatDateInput(
                        departure.earlyDiscountDeadline
                      )}
                      className="mt-1 w-full rounded border p-2"
                    />
                  </div>

                  <div className="md:col-span-2 xl:col-span-4 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="rounded bg-[#001F3F] px-4 py-2 text-white hover:bg-[#001733]"
                    >
                      Update Departure
                    </button>
                  </div>
                </form>

                <div className="mt-4 border-t pt-4">
                  <form action={deleteDeparture.bind(null, tour.id, departure.id)}>
                    <button
                      type="submit"
                      disabled={hasBookings}
                      className={`rounded px-4 py-2 text-white ${
                        hasBookings
                          ? "cursor-not-allowed bg-gray-400"
                          : "bg-red-700 hover:bg-red-800"
                      }`}
                    >
                      {hasBookings
                        ? "Cannot Delete — Has Bookings"
                        : "Delete Departure"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}