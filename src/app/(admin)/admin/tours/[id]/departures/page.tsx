import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DepartureStatus, Season } from "@prisma/client";

import { db } from "@/lib/db";
import { AddDepartureForm } from "@/components/admin/AddDepartureForm";
import ToursToastHandler from "@/components/admin/ToursToastHandler";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
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
  const allowed: DepartureStatus[] = [
    "EARLY_BOOKING",
    "AVAILABLE",
    "SOLD_OUT",
    "CLOSED",
  ];

  return allowed.includes(value as DepartureStatus)
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
  const allowed: Season[] = ["LOW", "SHOULDER", "HIGH", "PEAK"];

  return allowed.includes(value as Season)
    ? (value as Season)
    : "SHOULDER";
}

function toDateInputValue(value: Date | null) {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

async function createDeparture(tourId: string, formData: FormData) {
  "use server";

  const date = new Date(String(formData.get("date")));
  const season = parseSeason(String(formData.get("season")));
  const priceDouble = Number(formData.get("priceDouble"));
  let status = parseStatus(String(formData.get("status")));
  const capacity = Number(formData.get("capacity"));
  const bookedSeats = Number(formData.get("bookedSeats") ?? 0);

  const singleSupplement = parseOptionalNumber(
    formData.get("singleSupplement")
  );
  const tripleReduction = parseOptionalNumber(
    formData.get("tripleReduction")
  );

  const earlyDiscountPercent = parseOptionalNumber(
    formData.get("earlyDiscountPercent")
  );

  const earlyDiscountDeadlineValue = formData.get("earlyDiscountDeadline");
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

  if (
    Number.isNaN(date.getTime()) ||
    Number.isNaN(priceDouble) ||
    priceDouble < 0 ||
    Number.isNaN(capacity) ||
    capacity < 0 ||
    Number.isNaN(bookedSeats) ||
    bookedSeats < 0 ||
    bookedSeats > capacity
  ) {
    redirect(`/admin/tours/${tourId}/departures?error=invalid-departure-data`);
  }

  const remainingSeats = Math.max(0, capacity - bookedSeats);
  if (remainingSeats === 0) {
    status = "SOLD_OUT";
  }

  await db.departureDate.create({
    data: {
    tourId,
    date,
    season,
    price: priceDouble,
    priceDouble,
      singleSupplement,
      tripleReduction,
      capacity,
      bookedSeats,
      status,
      earlyDiscountPercent,
      earlyDiscountDeadline: validEarlyDiscountDeadline,
    },
  });

  redirect(`/admin/tours/${tourId}/departures?success=departure-created`);
}

async function updateDeparture(
  tourId: string,
  departureId: string,
  formData: FormData
) {
  "use server";

  const existing = await db.departureDate.findUnique({
    where: { id: departureId },
    include: {
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  });

  if (!existing || existing.tourId !== tourId) {
    redirect(`/admin/tours/${tourId}/departures?error=departure-not-found`);
  }

  const date = new Date(String(formData.get("date")));
  const season = parseSeason(String(formData.get("season")));
  const priceDouble = Number(formData.get("priceDouble"));
  let status = parseStatus(String(formData.get("status")));
  const capacity = Number(formData.get("capacity"));
  const bookedSeats = Number(formData.get("bookedSeats") ?? existing.bookedSeats);

  const singleSupplement = parseOptionalNumber(
    formData.get("singleSupplement")
  );
  const tripleReduction = parseOptionalNumber(
    formData.get("tripleReduction")
  );

  const earlyDiscountPercent = parseOptionalNumber(
    formData.get("earlyDiscountPercent")
  );

  const earlyDiscountDeadlineValue = formData.get("earlyDiscountDeadline");
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

  if (
    Number.isNaN(date.getTime()) ||
    Number.isNaN(priceDouble) ||
    priceDouble < 0 ||
    Number.isNaN(capacity) ||
    capacity < 0 ||
    Number.isNaN(bookedSeats) ||
    bookedSeats < 0
  ) {
    redirect(`/admin/tours/${tourId}/departures?error=invalid-departure-data`);
  }

  if (capacity < existing.bookedSeats || capacity < bookedSeats) {
    redirect(`/admin/tours/${tourId}/departures?error=capacity-below-booked`);
  }

  if (existing._count.bookings > 0 && priceDouble !== Number(existing.priceDouble)) {
    redirect(`/admin/tours/${tourId}/departures?error=price-locked`);
  }

  const remainingSeats = Math.max(0, capacity - bookedSeats);
  if (remainingSeats === 0) {
    status = "SOLD_OUT";
  }

  await db.departureDate.update({
    where: { id: departureId },
    data: {
      date,
      season,
      price: priceDouble,
      priceDouble,
      singleSupplement,
      tripleReduction,
      capacity,
      bookedSeats,
      status,
      earlyDiscountPercent,
      earlyDiscountDeadline: validEarlyDiscountDeadline,
    },
  });

  redirect(`/admin/tours/${tourId}/departures?success=departure-updated`);
}

async function deleteDeparture(tourId: string, departureId: string) {
  "use server";

  const existing = await db.departureDate.findUnique({
    where: { id: departureId },
    include: {
      _count: {
        select: {
          bookings: true,
          quotes: true,
        },
      },
    },
  });

  if (!existing || existing.tourId !== tourId) {
    redirect(`/admin/tours/${tourId}/departures?error=departure-not-found`);
  }

  if (existing._count.bookings > 0) {
    redirect(`/admin/tours/${tourId}/departures?error=departure-has-bookings`);
  }

  if (existing._count.quotes > 0) {
    redirect(`/admin/tours/${tourId}/departures?error=departure-has-quotes`);
  }

  await db.departureDate.delete({
    where: { id: departureId },
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

  return (
    <div className="space-y-6 p-6">
      <ToursToastHandler
        success={
          success === "departure-deleted"
            ? "Departure deleted successfully."
            : success === "departure-created"
              ? "Departure created successfully."
              : success === "departure-updated"
                ? "Departure updated successfully."
                : success
        }
        error={
          error === "departure-has-bookings"
            ? "Cannot delete this departure because it has existing bookings."
            : error === "departure-has-quotes"
              ? "Cannot delete this departure because it is linked to existing quotes."
            : error === "capacity-below-booked"
              ? "Capacity cannot be lower than the number of already booked seats."
              : error === "price-locked"
                ? "Double / twin price cannot be changed because this departure already has bookings."
                : error === "invalid-departure-data"
                  ? "Please check the departure data and try again."
                  : error === "departure-not-found"
                    ? "Departure not found."
                    : error
        }
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Departures</h1>
          <p className="text-sm text-muted-foreground">
            {tour.title} — add, edit, and manage departure dates and pricing.
          </p>
        </div>

        <div className="flex gap-3">
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
          <AddDepartureForm />

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
                      {getSeasonLabel(departure.season)} · Double/Twin:{" "}
                      {formatCurrency(Number(departure.priceDouble))}
                      {departure.singleSupplement != null && (
                        <> · Single Suppl.: {formatCurrency(Number(departure.singleSupplement))}</>
                      )}
                      {departure.tripleReduction != null && (
                        <> · Triple Red.: {formatCurrency(Number(departure.tripleReduction))}</>
                      )}
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
                      defaultValue={toDateInputValue(departure.date)}
                      className="mt-1 w-full rounded border p-2"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`season-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Season
                    </label>
                    <select
                      id={`season-${departure.id}`}
                      name="season"
                      defaultValue={departure.season}
                      className="mt-1 w-full rounded border p-2"
                    >
                      <option value="LOW">Low Season</option>
                      <option value="SHOULDER">Shoulder Season</option>
                      <option value="HIGH">High Season</option>
                      <option value="PEAK">Peak Season</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`priceDouble-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Double / Twin Price
                    </label>
                    <input
                      id={`priceDouble-${departure.id}`}
                      name="priceDouble"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      defaultValue={Number(departure.priceDouble)}
                      disabled={hasBookings}
                      className="mt-1 w-full rounded border p-2 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    {hasBookings && (
                      <p className="mt-1 text-xs text-red-500">
                        Price locked — bookings already exist.
                      </p>
                    )}
                  </div>

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
                      htmlFor={`singleSupplement-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Single Supplement
                    </label>
                    <input
                      id={`singleSupplement-${departure.id}`}
                      name="singleSupplement"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={departure.singleSupplement ?? ""}
                      className="mt-1 w-full rounded border p-2"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`tripleReduction-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Triple Reduction
                    </label>
                    <input
                      id={`tripleReduction-${departure.id}`}
                      name="tripleReduction"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={departure.tripleReduction ?? ""}
                      className="mt-1 w-full rounded border p-2"
                    />
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
                      htmlFor={`bookedSeats-${departure.id}`}
                      className="text-sm font-medium"
                    >
                      Booked Seats
                    </label>
                    <input
                      id={`bookedSeats-${departure.id}`}
                      name="bookedSeats"
                      type="number"
                      min="0"
                      defaultValue={departure.bookedSeats}
                      className="mt-1 w-full rounded border p-2"
                    />
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
                      defaultValue={toDateInputValue(
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